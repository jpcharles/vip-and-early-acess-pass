import { useState, useCallback } from "react";
import { useLoaderData, useActionData, useNavigate, useFetcher } from "@remix-run/react";
import pkg from '@shopify/polaris';
const {
  Page,
  Card,
  Button,
  Text,
  TextField,
  Select,
  ButtonGroup,
  Icon,
  Box,
  Heading,
  EmptyState,
  DataTable,
  Badge,
  BlockStack,
  InlineStack,
  DownloadIcon,
} = pkg;
import {
  SearchIcon,
  SortIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  PersonIcon,
  CalendarIcon,
  ArrowLeftIcon
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json, redirect } from "@remix-run/node";
import prisma from "../db.server";
import { CampaignUtils } from "../lib/campaign-utils";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  
  const campaign = await prisma.earlyAccessCampaign.findFirst({
    where: { 
      id,
      shop: session.shop 
    },
    include: {
      signups: {
        orderBy: { createdAt: 'desc' }
      },
      gatedPages: true,
    },
  });

  if (!campaign) {
    throw new Response("Campaign not found", { status: 404 });
  }

  return json({
    campaign: CampaignUtils.formatCampaignForDisplay(campaign),
  });
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "export") {
    const campaign = await prisma.earlyAccessCampaign.findFirst({
      where: { 
        id,
        shop: session.shop 
      },
      include: {
        signups: {
          orderBy: { createdAt: 'desc' }
        },
      },
    });

    if (!campaign) {
      return json({ error: "Campaign not found" }, { status: 404 });
    }

    // Generate CSV data
    const csvHeaders = "Email,First Name,Last Name,Phone,Signup Date,Klaviyo Synced,Omnisend Synced\n";
    const csvRows = campaign.signups.map(signup => 
      `${signup.email},${signup.firstName || ''},${signup.lastName || ''},${signup.phone || ''},${signup.createdAt.toISOString()},${signup.klaviyoSynced ? 'Yes' : 'No'},${signup.omnisendSynced ? 'Yes' : 'No'}`
    ).join('\n');
    
    const csvContent = csvHeaders + csvRows;
    
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${campaign.name}-signups.csv"`
      }
    });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function CampaignSignups() {
  const { campaign } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  const filteredSignups = campaign.signups.filter(signup => 
    signup.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (signup.firstName && signup.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (signup.lastName && signup.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedSignups = filteredSignups.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleExport = () => {
    fetcher.submit({ action: "export" }, { method: "POST" });
  };

  const getSyncStatus = (signup) => {
    if (signup.klaviyoSynced && signup.omnisendSynced) {
      return <Badge status="success">Synced</Badge>;
    } else if (signup.klaviyoSynced || signup.omnisendSynced) {
      return <Badge status="warning">Partial</Badge>;
    } else {
      return <Badge status="critical">Not Synced</Badge>;
    }
  };

  const rows = sortedSignups.map(signup => [
    signup.email,
    signup.firstName || '-',
    signup.lastName || '-',
    signup.phone || '-',
    new Date(signup.createdAt).toLocaleDateString(),
    getSyncStatus(signup),
  ]);

  return (
    <Page>
      <TitleBar title={`${campaign.name} - Signups`}>
        <ButtonGroup>
          <Button onClick={() => navigate(`/app/campaigns/${campaign.id}`)} icon={ArrowLeftIcon}>
            Back to Campaign
          </Button>
          <Button onClick={handleExport} icon={DownloadIcon}>
            Export CSV
          </Button>
        </ButtonGroup>
      </TitleBar>

      <BlockStack gap="500">
        {/* Campaign Info */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Heading>{campaign.name}</Heading>
              <Badge status={campaign.isActive ? "success" : "critical"}>
                {campaign.isActive ? "Active" : "Inactive"}
              </Badge>
            </InlineStack>
            <Text variant="bodyMd" color="subdued">
              {campaign.description || "No description"}
            </Text>
            <InlineStack gap="400">
              <InlineStack gap="200">
                <Icon source={PersonIcon} />
                <Text variant="bodyMd">{campaign.signupCount} signups</Text>
              </InlineStack>
              <InlineStack gap="200">
                <Icon source={CalendarIcon} />
                <Text variant="bodyMd">
                  Created {new Date(campaign.createdAt).toLocaleDateString()}
                </Text>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Filters and Search */}
        <Card>
          <BlockStack gap="300">
            <InlineStack gap="300" align="space-between">
              <TextField
                label="Search signups"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by email, name..."
                prefix={<Icon source={SearchIcon} />}
              />
              <Select
                label="Sort by"
                options={[
                  { label: "Signup Date", value: "createdAt" },
                  { label: "Email", value: "email" },
                  { label: "First Name", value: "firstName" },
                  { label: "Last Name", value: "lastName" },
                ]}
                value={sortBy}
                onChange={setSortBy}
              />
              <Button
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                icon={SortIcon}
              >
                {sortDirection === "asc" ? "Ascending" : "Descending"}
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Signups Table */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingMd">Signups ({filteredSignups.length})</Text>
              <Text variant="bodySm" color="subdued">
                Showing {filteredSignups.length} of {campaign.signupCount} signups
              </Text>
            </InlineStack>

            {filteredSignups.length === 0 ? (
              <EmptyState
                heading="No signups found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>No signups match your search criteria.</p>
              </EmptyState>
            ) : (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                ]}
                headings={[
                  'Email',
                  'First Name',
                  'Last Name',
                  'Phone',
                  'Signup Date',
                  'Sync Status',
                ]}
                rows={rows}
              />
            )}
          </BlockStack>
        </Card>

        {/* Sync Status Summary */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Sync Status Summary</Text>
            <InlineStack gap="400">
              <InlineStack gap="200">
                <Icon source={CheckCircleIcon} />
                <Text variant="bodyMd">
                  {campaign.signups.filter(s => s.klaviyoSynced && s.omnisendSynced).length} Fully Synced
                </Text>
              </InlineStack>
              <InlineStack gap="200">
                <Icon source={AlertTriangleIcon} />
                <Text variant="bodyMd">
                  {campaign.signups.filter(s => s.klaviyoSynced || s.omnisendSynced).length - campaign.signups.filter(s => s.klaviyoSynced && s.omnisendSynced).length} Partially Synced
                </Text>
              </InlineStack>
              <InlineStack gap="200">
                <Icon source={AlertTriangleIcon} />
                <Text variant="bodyMd">
                  {campaign.signups.filter(s => !s.klaviyoSynced && !s.omnisendSynced).length} Not Synced
                </Text>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
