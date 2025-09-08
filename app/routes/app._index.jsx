import { useState, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  DataTable,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  ButtonGroup,
  Modal,
  TextField,
  Select,
  FormLayout,
  Banner,
  EmptyState,
  Pagination,
  Filters,
  ChoiceList,
  RangeSlider,
  DatePicker,
  Popover,
  ActionList,
  Icon,
  Tooltip,
  Thumbnail,
  Link,
  Box,
  Divider,
  Spinner,
  Toast,
  Frame,
} from "@shopify/polaris";
import {
  TitleBar,
  useAppBridge,
} from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";
import { PlusIcon, EditIcon, DeleteIcon, ViewIcon, CopyIcon } from "@shopify/polaris-icons";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  try {
    const campaigns = await prisma.earlyAccessCampaign.findMany({
      where: { shop: session.shop },
      include: {
        signups: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return json({ campaigns });
  } catch (error) {
    console.error('Error loading campaigns:', error);
    return json({ campaigns: [] });
  }
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
        const productIds = JSON.parse(formData.get("productIds") || "[]");
        const collectionIds = JSON.parse(formData.get("collectionIds") || "[]");
        const klaviyoListId = formData.get("klaviyoListId");
        const omnisendListId = formData.get("omnisendListId");

        const secretLink = accessType === "SECRET_LINK" ? 
          `https://${session.shop}/pages/early-access-${Date.now()}` : null;

        const campaign = await prisma.earlyAccessCampaign.create({
          data: {
            shop: session.shop,
            name,
            description,
            accessType,
            password: accessType === "PASSWORD" ? password : null,
            secretLink,
            productIds,
            collectionIds,
            klaviyoListId: klaviyoListId || null,
            omnisendListId: omnisendListId || null,
          },
        });

        return json({ success: true, campaign });
      }

      case "delete": {
        const campaignId = formData.get("campaignId");
        await prisma.earlyAccessCampaign.delete({
          where: { id: campaignId },
        });
        return json({ success: true });
      }

      case "toggle": {
        const campaignId = formData.get("campaignId");
        const isActive = formData.get("isActive") === "true";
        
        await prisma.earlyAccessCampaign.update({
          where: { id: campaignId },
          data: { isActive: !isActive },
        });
        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in action:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Index() {
  const { campaigns } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Form state for creating campaigns
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    accessType: "PASSWORD",
    password: "",
    productIds: [],
    collectionIds: [],
    klaviyoListId: "",
    omnisendListId: "",
  });

  const showToast = (message) => {
    setToastMessage(message);
    setToastActive(true);
  };

  const handleCreateCampaign = () => {
    const formDataToSend = new FormData();
    formDataToSend.append("action", "create");
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("accessType", formData.accessType);
    formDataToSend.append("password", formData.password);
    formDataToSend.append("productIds", JSON.stringify(formData.productIds));
    formDataToSend.append("collectionIds", JSON.stringify(formData.collectionIds));
    formDataToSend.append("klaviyoListId", formData.klaviyoListId);
    formDataToSend.append("omnisendListId", formData.omnisendListId);

    fetcher.submit(formDataToSend, { method: "post" });
    setIsCreateModalOpen(false);
    setFormData({
      name: "",
      description: "",
      accessType: "PASSWORD",
      password: "",
      productIds: [],
      collectionIds: [],
      klaviyoListId: "",
      omnisendListId: "",
    });
  };

  const handleDeleteCampaign = (campaignId) => {
    const formDataToSend = new FormData();
    formDataToSend.append("action", "delete");
    formDataToSend.append("campaignId", campaignId);
    fetcher.submit(formDataToSend, { method: "post" });
    setIsDeleteModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleToggleCampaign = (campaignId, isActive) => {
    const formDataToSend = new FormData();
    formDataToSend.append("action", "toggle");
    formDataToSend.append("campaignId", campaignId);
    formDataToSend.append("isActive", isActive.toString());
    fetcher.submit(formDataToSend, { method: "post" });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Link copied to clipboard!");
  };

  const getAccessTypeLabel = (type) => {
    switch (type) {
      case "PASSWORD": return "Password Protected";
      case "SECRET_LINK": return "Secret Link";
      case "EMAIL_SIGNUP": return "Email Signup";
      case "PASSWORD_OR_EMAIL": return "Password or Email";
      default: return type;
    }
  };

  const rows = campaigns.map((campaign) => [
    <Text variant="bodyMd" fontWeight="bold" as="p">
      {campaign.name}
    </Text>,
    <Text variant="bodyMd" as="p">
      {campaign.description || "No description"}
    </Text>,
    <Badge status={campaign.isActive ? "success" : "critical"}>
      {campaign.isActive ? "Active" : "Inactive"}
    </Badge>,
    <Text variant="bodyMd" as="p">
      {getAccessTypeLabel(campaign.accessType)}
    </Text>,
    <Text variant="bodyMd" as="p">
      {campaign.totalSignups} signups
    </Text>,
    <Text variant="bodyMd" as="p">
      {campaign.totalViews} views
    </Text>,
    <ButtonGroup>
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
        onClick={() => navigate(`/app/campaigns/${campaign.id}/edit`)}
      >
        Edit
      </Button>
      <Button
        size="slim"
        icon={CopyIcon}
        onClick={() => copyToClipboard(campaign.secretLink || "")}
        disabled={!campaign.secretLink}
      >
        Copy Link
      </Button>
      <Button
        size="slim"
        icon={DeleteIcon}
        destructive
        onClick={() => {
          setSelectedCampaign(campaign);
          setIsDeleteModalOpen(true);
        }}
      >
        Delete
      </Button>
    </ButtonGroup>,
  ]);

  const accessTypeOptions = [
    { label: "Password Protected", value: "PASSWORD" },
    { label: "Secret Link", value: "SECRET_LINK" },
    { label: "Email Signup", value: "EMAIL_SIGNUP" },
    { label: "Password or Email", value: "PASSWORD_OR_EMAIL" },
  ];

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
    />
  ) : null;

  return (
    <Frame>
      <Page
        title="Early Access Pass Campaigns"
        subtitle="Create and manage VIP early access campaigns for your products"
        primaryAction={{
          content: "Create Campaign",
          icon: PlusIcon,
          onAction: () => setIsCreateModalOpen(true),
        }}
      >
        <TitleBar title="Early Access Pass" />
        
        <Layout>
          <Layout.Section>
            {campaigns.length === 0 ? (
              <Card>
                <EmptyState
                  heading="Create your first Early Access campaign"
                  action={{
                    content: "Create Campaign",
                    onAction: () => setIsCreateModalOpen(true),
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Start creating VIP early access campaigns to give your customers exclusive access to new products.
                  </p>
                </EmptyState>
              </Card>
            ) : (
              <Card>
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text", 
                    "text",
                    "text",
                    "numeric",
                    "numeric",
                    "text",
                  ]}
                  headings={[
                    "Campaign Name",
                    "Description",
                    "Status",
                    "Access Type",
                    "Signups",
                    "Views",
                    "Actions",
                  ]}
                  rows={rows}
                />
              </Card>
            )}
          </Layout.Section>
        </Layout>

        {/* Create Campaign Modal */}
        <Modal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Campaign"
          primaryAction={{
            content: "Create Campaign",
            onAction: handleCreateCampaign,
            disabled: !formData.name.trim(),
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
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                placeholder="e.g., Summer Collection Early Access"
                autoComplete="off"
              />
              
              <TextField
                label="Description"
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Describe your campaign..."
                multiline={3}
                autoComplete="off"
              />
              
              <Select
                label="Access Type"
                options={accessTypeOptions}
                value={formData.accessType}
                onChange={(value) => setFormData({ ...formData, accessType: value })}
              />
              
              {formData.accessType === "PASSWORD" && (
                <TextField
                  label="Password"
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                  placeholder="Enter password for access"
                  type="password"
                  autoComplete="off"
                />
              )}
              
              <TextField
                label="Klaviyo List ID (Optional)"
                value={formData.klaviyoListId}
                onChange={(value) => setFormData({ ...formData, klaviyoListId: value })}
                placeholder="Enter Klaviyo list ID for email sync"
                autoComplete="off"
              />
              
              <TextField
                label="Omnisend List ID (Optional)"
                value={formData.omnisendListId}
                onChange={(value) => setFormData({ ...formData, omnisendListId: value })}
                placeholder="Enter Omnisend list ID for email sync"
                autoComplete="off"
              />
            </FormLayout>
          </Modal.Section>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Campaign"
          primaryAction={{
            content: "Delete",
            destructive: true,
            onAction: () => handleDeleteCampaign(selectedCampaign?.id),
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setIsDeleteModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to delete "{selectedCampaign?.name}"? This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>

        {toastMarkup}
      </Page>
    </Frame>
  );
}
