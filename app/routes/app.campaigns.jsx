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
  const status = url.searchParams.get("status") || "all";

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
    ...(status !== "all" && {
      isActive: status === "active",
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
      status,
    },
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    switch (action) {
      case "create": {
        const name = formData.get("name");
        const description = formData.get("description");
        const accessType = formData.get("accessType");
        const password = formData.get("password");
        const customMessage = formData.get("customMessage");
        const redirectUrl = formData.get("redirectUrl");
        const expiresAt = formData.get("expiresAt");
        const klaviyoListId = formData.get("klaviyoListId");
        const omnisendListId = formData.get("omnisendListId");
        const tagName = formData.get("tagName");

        const campaignData = {
          shop: session.shop,
          name,
          description,
          accessType,
          customMessage,
          redirectUrl,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          klaviyoListId,
          omnisendListId,
          tagName: tagName || "VIP Early Access",
          autoTagEnabled: true,
        };

        // Handle password hashing
        if (accessType === "PASSWORD" || accessType === "PASSWORD_OR_SIGNUP") {
          if (!password) {
            throw new Error("Password is required for this access type");
          }
          campaignData.password = await CampaignUtils.hashPassword(password);
        }

        // Generate secret link if needed
        if (accessType === "SECRET_LINK") {
          campaignData.secretLink = CampaignUtils.generateSecretLink();
        }

        const campaign = await prisma.earlyAccessCampaign.create({
          data: campaignData,
        });

        return json({ success: true, campaign });
      }

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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [searchValue, setSearchValue] = useState(filters.search);
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [sortValue, setSortValue] = useState("createdAt_desc");
  const [toastMessage, setToastMessage] = useState("");
  
  // Form state for create modal
  const [createFormData, setCreateFormData] = useState({
    name: "",
    description: "",
    accessType: "PASSWORD",
    password: "",
    customMessage: "",
    redirectUrl: "",
    klaviyoListId: "",
    omnisendListId: "",
    tagName: "VIP Early Access"
  });

  const isLoading = fetcher.state === "loading" || fetcher.state === "submitting";

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        setToastMessage("Campaign created successfully!");
        setIsCreateModalOpen(false);
        setCreateFormData({
          name: "",
          description: "",
          accessType: "PASSWORD",
          password: "",
          customMessage: "",
          redirectUrl: "",
          klaviyoListId: "",
          omnisendListId: "",
          tagName: "VIP Early Access"
        });
        // Refresh the page to show the new campaign
        window.location.reload();
      } else if (fetcher.data.error) {
        setToastMessage(`Error: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.data]);

  // Handle form submissions
  const handleCreateCampaign = () => {
    fetcher.submit(
      { action: "create", ...createFormData },
      { method: "post" }
    );
  };

  const handleCreateFormChange = (field, value) => {
    setCreateFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    const url = new URL(window.location);
    if (value !== "all") {
      url.searchParams.set("status", value);
    } else {
      url.searchParams.delete("status");
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
        <Button
          primary
          icon={PlusIcon}
          onClick={() => {
            console.log("Create Campaign button clicked");
            setIsCreateModalOpen(true);
          }}
        >
          Create Campaign
        </Button>
      </TitleBar>

      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd">Campaigns ({pagination.totalCount})</Text>
                <InlineStack gap="200">
                  <TextField
                    placeholder="Search campaigns..."
                    value={searchValue}
                    onChange={handleSearchChange}
                    prefix={<Icon source={SearchIcon} />}
                    clearButton
                  />
                  <Select
                    label="Status"
                    options={[
                      { label: "All", value: "all" },
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inactive" },
                    ]}
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
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
                    <Button
                      primary
                      onClick={() => navigate("/app/campaigns/new")}
                    >
                      Create Campaign
                    </Button>
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

      {/* Create Campaign Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Early Access Campaign"
        primaryAction={{
          content: "Create Campaign",
          onAction: handleCreateCampaign,
          loading: isLoading,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsCreateModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Campaign Name"
              name="name"
              placeholder="e.g., Black Friday Early Access"
              value={createFormData.name}
              onChange={(value) => handleCreateFormChange("name", value)}
              required
            />
            <TextField
              label="Description"
              name="description"
              placeholder="Describe your campaign..."
              value={createFormData.description}
              onChange={(value) => handleCreateFormChange("description", value)}
              multiline={3}
            />
            <Select
              label="Access Type"
              name="accessType"
              options={[
                { label: "Password Protected", value: "PASSWORD" },
                { label: "Secret Link", value: "SECRET_LINK" },
                { label: "Email Signup Required", value: "EMAIL_SIGNUP" },
                { label: "Password or Email Signup", value: "PASSWORD_OR_SIGNUP" },
              ]}
              value={createFormData.accessType}
              onChange={(value) => handleCreateFormChange("accessType", value)}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              placeholder="Enter password for access"
              value={createFormData.password}
              onChange={(value) => handleCreateFormChange("password", value)}
              helpText="Required for password-based access types"
            />
            <TextField
              label="Custom Message"
              name="customMessage"
              placeholder="Welcome message for customers..."
              value={createFormData.customMessage}
              onChange={(value) => handleCreateFormChange("customMessage", value)}
              multiline={2}
            />
            <TextField
              label="Redirect URL"
              name="redirectUrl"
              placeholder="https://yourstore.com/early-access"
              value={createFormData.redirectUrl}
              onChange={(value) => handleCreateFormChange("redirectUrl", value)}
              helpText="Where to redirect after successful access"
            />
            <TextField
              label="Klaviyo List ID"
              name="klaviyoListId"
              placeholder="Enter Klaviyo list ID for auto-sync"
              value={createFormData.klaviyoListId}
              onChange={(value) => handleCreateFormChange("klaviyoListId", value)}
            />
            <TextField
              label="Omnisend List ID"
              name="omnisendListId"
              placeholder="Enter Omnisend list ID for auto-sync"
              value={createFormData.omnisendListId}
              onChange={(value) => handleCreateFormChange("omnisendListId", value)}
            />
            <TextField
              label="Tag Name"
              name="tagName"
              placeholder="VIP Early Access"
              value={createFormData.tagName}
              onChange={(value) => handleCreateFormChange("tagName", value)}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

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
