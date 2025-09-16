import { useState, useCallback, useEffect } from "react";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  DataTable,
  Badge,
  Text,
  InlineStack,
  Modal,
  TextField,
  Select,
  EmptyState,
  Pagination,
  FormLayout,
  Icon,
  Box,
  BlockStack,
  Toast,
} from '@shopify/polaris';

import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon,
  DuplicateIcon,
  SettingsIcon,
  SearchIcon,
  PersonIcon,
  LinkIcon,
  KeyIcon,
  EmailIcon,
} from "@shopify/polaris-icons";

import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import { CampaignUtils } from "../lib/campaign-utils";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    shop: session.shop,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [campaigns, totalCount] = await Promise.all([
    prisma.earlyAccessCampaign.findMany({
      where,
      include: {
        signups: true,
        gatedPages: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.earlyAccessCampaign.count({ where }),
  ]);

  const formattedCampaigns = campaigns.map(CampaignUtils.formatCampaignForDisplay);

  return json({
    campaigns: formattedCampaigns,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
    filters: {
      search,
    },
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    switch (action) {
      case "update": {
        const id = formData.get("id");
        const updates = {};

        // Only update provided fields
        if (formData.has("name")) updates.name = formData.get("name");
        if (formData.has("description")) updates.description = formData.get("description");
        if (formData.has("customMessage")) updates.customMessage = formData.get("customMessage");
        if (formData.has("redirectUrl")) updates.redirectUrl = formData.get("redirectUrl");
        if (formData.has("expiresAt")) {
          updates.expiresAt = formData.get("expiresAt") ? new Date(formData.get("expiresAt")) : null;
        }
        if (formData.has("klaviyoListId")) updates.klaviyoListId = formData.get("klaviyoListId");
        if (formData.has("omnisendListId")) updates.omnisendListId = formData.get("omnisendListId");
        if (formData.has("tagName")) updates.tagName = formData.get("tagName");

        const campaign = await prisma.earlyAccessCampaign.update({
          where: { id },
          data: updates,
        });

        return json({ success: true, campaign });
      }

      case "toggle": {
        const id = formData.get("id");
        const isActive = formData.get("isActive") === "true";

        const campaign = await prisma.earlyAccessCampaign.update({
          where: { id },
          data: { isActive },
        });

        return json({ success: true, campaign });
      }

      case "delete": {
        const id = formData.get("id");

        await prisma.earlyAccessCampaign.delete({
          where: { id },
        });

        return json({ success: true });
      }

      case "regenerateSecretLink": {
        const id = formData.get("id");
        const newSecretLink = CampaignUtils.generateSecretLink();

        const campaign = await prisma.earlyAccessCampaign.update({
          where: { id },
          data: { secretLink: newSecretLink },
        });

        return json({ success: true, campaign });
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }
};

export default function Campaigns() {
  const { campaigns, pagination, filters } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [searchValue, setSearchValue] = useState(filters.search);
  const [sortValue, setSortValue] = useState("createdAt_desc");
  const [toastMessage, setToastMessage] = useState("");


  const isLoading = fetcher.state === "loading" || fetcher.state === "submitting";

  // Handle fetcher responses for other actions
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        // Refresh the page to show updated data
        window.location.reload();
      } else if (fetcher.data.error) {
        setToastMessage(`Error: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleUpdateCampaign = (formData) => {
    fetcher.submit(
      { action: "update", id: editingCampaign.id, ...formData },
      { method: "post" }
    );
  };

  const handleToggleCampaign = (campaign) => {
    fetcher.submit(
      { action: "toggle", id: campaign.id, isActive: String(!campaign.isActive) },
      { method: "post" }
    );
  };

  const handleDeleteCampaign = (campaign) => {
    if (window.confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      fetcher.submit(
        { action: "delete", id: campaign.id },
        { method: "post" }
      );
    }
  };

  const handleRegenerateSecretLink = (campaign) => {
    fetcher.submit(
      { action: "regenerateSecretLink", id: campaign.id },
      { method: "post" }
    );
  };

  // Handle search and filters
  const handleSearchChange = (value) => {
    setSearchValue(value);
    const url = new URL(window.location);
    if (value) {
      url.searchParams.set("search", value);
    } else {
      url.searchParams.delete("search");
    }
    navigate(url.pathname + url.search);
  };


  // Get access type display info
  const getAccessTypeInfo = (accessType) => {
    const types = {
      PASSWORD: { label: "Password", icon: KeyIcon, color: "info" },
      SECRET_LINK: { label: "Secret Link", icon: LinkIcon, color: "success" },
      EMAIL_SIGNUP: { label: "Email Signup", icon: EmailIcon, color: "warning" },
      PASSWORD_OR_SIGNUP: { label: "Password or Signup", icon: PersonIcon, color: "attention" },
    };
    return types[accessType] || { label: accessType, icon: SettingsIcon, color: "info" };
  };

  // Table rows
  const rows = campaigns.map((campaign) => {
    const accessTypeInfo = getAccessTypeInfo(campaign.accessType);
    const AccessIcon = accessTypeInfo.icon;

    return [
      <Box key="name">
        <Text variant="bodyMd" fontWeight="semibold">
          {campaign.name}
        </Text>
        {campaign.description && (
          <Text variant="bodySm" color="subdued">
            {campaign.description}
          </Text>
        )}
      </Box>,
      <InlineStack key="access" gap="200" align="center">
        <AccessIcon />
        <Text variant="bodyMd">{accessTypeInfo.label}</Text>
      </InlineStack>,
      <InlineStack key="status" gap="200" align="center">
        <Badge status={campaign.isActive ? "success" : "critical"}>
          {campaign.isActive ? "Active" : "Inactive"}
        </Badge>
        {campaign.isExpired && (
          <Badge status="warning">Expired</Badge>
        )}
      </InlineStack>,
      <Text key="signups" variant="bodyMd">
        {campaign.signupCount} signups
      </Text>,
      <Text key="created" variant="bodyMd">
        {new Date(campaign.createdAt).toLocaleDateString()}
      </Text>,
      <InlineStack key="actions" gap="100">
        <Button
          size="slim"
          icon={ViewIcon}
          onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
        >
          View
        </Button>
        <Button
          size="slim"
          icon={EditIcon}
          onClick={() => {
            setEditingCampaign(campaign);
            setIsEditModalOpen(true);
          }}
        >
          Edit
        </Button>
        <Button
          size="slim"
          onClick={() => handleToggleCampaign(campaign)}
        >
          {campaign.isActive ? "Pause" : "Activate"}
        </Button>
        {campaign.accessType === "SECRET_LINK" && (
          <Button
            size="slim"
            icon={DuplicateIcon}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(campaign.secretLinkUrl);
                setToastMessage("Secret link copied to clipboard!");
              } catch (error) {
                console.error("Failed to copy to clipboard:", error);
                setToastMessage("Failed to copy link to clipboard");
              }
            }}
          >
            Copy Link
          </Button>
        )}
        <Button
          size="slim"
          icon={DeleteIcon}
          destructive
          onClick={() => handleDeleteCampaign(campaign)}
        >
          Delete
        </Button>
      </InlineStack>,
    ];
  });

  return (
    <Page>
      <TitleBar title="Early Access Campaigns">
        {/* <Button
          primary
          icon={PlusIcon}
          onClick={() => {
            console.log('TitleBar Create Campaign button clicked');
            console.log('Attempting to navigate to /app/campaigns/new');
            try {
              navigate('/app/campaigns/new');
            } catch (error) {
              console.error('Navigation error:', error);
              // Fallback to window location
              window.location.href = '/app/campaigns/new';
            }
          }}
        >
          Create Campaign
        </Button> */}
      </TitleBar>

      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd">Campaigns ({pagination.totalCount})</Text>
                <InlineStack gap="200">
                  <TextField
                    placeholder="Search campaigns..."
                    value={searchValue}
                    onChange={handleSearchChange}
                    prefix={<Icon source={SearchIcon} />}
                    clearButton
                  />
                </InlineStack>
              </InlineStack>

              {campaigns.length === 0 ? (
                <EmptyState
                  heading="No campaigns yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create early access campaigns to give VIP customers exclusive access to your products.</p>
                  <Box paddingBlockStart="400">
                    <Link url="/app/campaigns/new" removeUnderline>
                      <Button
                        primary
                        // onClick={() => {
                        //   navigate('/app/campaigns/new');

                        // }}
                      >
                        Create Campaign
                      </Button>
                    </Link>
                  </Box>
                </EmptyState>
              ) : (
                <>
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                    headings={["Campaign", "Access Type", "Status", "Signups", "Created", "Actions"]}
                    rows={rows}
                    footerContent={`Showing ${campaigns.length} of ${pagination.totalCount} campaigns`}
                  />

                  {pagination.totalPages > 1 && (
                    <Box paddingBlockStart="400">
                      <Pagination
                        hasPrevious={pagination.page > 1}
                        onPrevious={() => {
                          const url = new URL(window.location);
                          url.searchParams.set("page", (pagination.page - 1).toString());
                          navigate(url.pathname + url.search);
                        }}
                        hasNext={pagination.page < pagination.totalPages}
                        onNext={() => {
                          const url = new URL(window.location);
                          url.searchParams.set("page", (pagination.page + 1).toString());
                          navigate(url.pathname + url.search);
                        }}
                      />
                    </Box>
                  )}
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>


      {/* Toast notifications */}
      {toastMessage && (
        <Toast
          content={toastMessage}
          onDismiss={() => setToastMessage("")}
        />
      )}
    </Page>
  );
}
