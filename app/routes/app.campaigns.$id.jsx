import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  FormLayout,
  Box,
  Badge,
  Modal,
  Checkbox,
  ResourceList,
  ResourceItem,
  Thumbnail,
  EmptyState,
  DataTable,
  Tabs,
  Toast,
} from "@shopify/polaris";
import pkg from '@shopify/polaris';
const {TabsPanel} = pkg;

import {
  KeyIcon,
  LinkIcon,
  EmailIcon,

  AlertTriangleIcon,

  CalendarIcon,
  PersonIcon,

  DuplicateIcon,
  EditIcon,

  SettingsIcon,
  PlusIcon,
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
    where: { id, shop: session.shop },
    include: {
      signups: {
        orderBy: { createdAt: "desc" },
      },
      gatedPages: true,
    },
  });

  if (!campaign) {
    throw new Response("Campaign not found", { status: 404 });
  }

  const formattedCampaign = CampaignUtils.formatCampaignForDisplay(campaign);

  return json({ campaign: formattedCampaign });
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    switch (action) {
      case "update": {
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
        if (formData.has("isActive")) updates.isActive = formData.get("isActive") === "true";

        const campaign = await prisma.earlyAccessCampaign.update({
          where: { id },
          data: updates,
        });

        return json({ success: true, campaign });
      }

      case "regenerateSecretLink": {
        const newSecretLink = CampaignUtils.generateSecretLink();

        const campaign = await prisma.earlyAccessCampaign.update({
          where: { id },
          data: { secretLink: newSecretLink },
        });

        return json({ success: true, campaign });
      }

      case "createGatedPage": {
        const title = formData.get("title");
        const content = formData.get("content");
        const metaTitle = formData.get("metaTitle");
        const metaDescription = formData.get("metaDescription");
        const slug = CampaignUtils.generateSlug(title);

        // Check if slug already exists
        const existingPage = await prisma.gatedPage.findUnique({
          where: { slug },
        });

        if (existingPage) {
          return json({ success: false, error: "A page with this title already exists" }, { status: 400 });
        }

        const gatedPage = await prisma.gatedPage.create({
          data: {
            campaignId: id,
            shop: session.shop,
            title,
            content,
            slug,
            metaTitle,
            metaDescription,
          },
        });

        return json({ success: true, gatedPage });
      }

      case "updateGatedPage": {
        const pageId = formData.get("pageId");
        const updates = {};

        if (formData.has("title")) updates.title = formData.get("title");
        if (formData.has("content")) updates.content = formData.get("content");
        if (formData.has("metaTitle")) updates.metaTitle = formData.get("metaTitle");
        if (formData.has("metaDescription")) updates.metaDescription = formData.get("metaDescription");
        if (formData.has("isActive")) updates.isActive = formData.get("isActive") === "true";

        const gatedPage = await prisma.gatedPage.update({
          where: { id: pageId },
          data: updates,
        });

        return json({ success: true, gatedPage });
      }

      case "deleteGatedPage": {
        const pageId = formData.get("pageId");

        await prisma.gatedPage.delete({
          where: { id: pageId },
        });

        return json({ success: true });
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }
};

export default function CampaignDetail() {
  const { campaign } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGatedPageModalOpen, setIsGatedPageModalOpen] = useState(false);
  const [editingGatedPage, setEditingGatedPage] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  const isLoading = fetcher.state === "loading" || fetcher.state === "submitting";

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

  const accessTypeInfo = getAccessTypeInfo(campaign.accessType);
  const AccessIcon = accessTypeInfo.icon;

  // Handle copy to clipboard
  const handleCopy = (text, message) => {
    navigator.clipboard.writeText(text);
    setToastMessage(message);
  };

  // Render campaign overview
  const renderOverview = () => {
    return (
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">
                Campaign Overview
              </Text>
              <Button
                icon={EditIcon}
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit
              </Button>
            </InlineStack>

            <FormLayout>
              <TextField
                label="Campaign Name"
                value={campaign.name}
                readOnly
              />
              <TextField
                label="Description"
                value={campaign.description || ""}
                readOnly
                multiline={2}
              />
              <InlineStack gap="200" align="center">
                <AccessIcon />
                <Text variant="bodyMd">{accessTypeInfo.label}</Text>
              </InlineStack>
              <InlineStack gap="200" align="center">
                <Badge status={campaign.isActive ? "success" : "critical"}>
                  {campaign.isActive ? "Active" : "Inactive"}
                </Badge>
                {campaign.isExpired && (
                  <Badge status="warning">Expired</Badge>
                )}
              </InlineStack>
            </FormLayout>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  Access Information
                </Text>
                {campaign.accessType === "SECRET_LINK" && campaign.secretLinkUrl && (
                  <Box>
                    <Text variant="bodyMd" fontWeight="semibold">
                      Secret Link:
                    </Text>
                    <InlineStack gap="200" align="center">
                      <Text variant="bodyMd" color="subdued">
                        {campaign.secretLinkUrl}
                      </Text>
                      <Button
                        size="slim"
                        icon={DuplicateIcon}
                        onClick={() => handleCopy(campaign.secretLinkUrl, "Secret link copied!")}
                      >
                        Copy
                      </Button>
                    </InlineStack>
                  </Box>
                )}
                {campaign.redirectUrl && (
                  <Box>
                    <Text variant="bodyMd" fontWeight="semibold">
                      Redirect URL:
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      {campaign.redirectUrl}
                    </Text>
                  </Box>
                )}
                {campaign.customMessage && (
                  <Box>
                    <Text variant="bodyMd" fontWeight="semibold">
                      Custom Message:
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      {campaign.customMessage}
                    </Text>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  Statistics
                </Text>
                <InlineStack gap="200" align="center">
                  <PersonIcon />
                  <Text variant="bodyMd">{campaign.signupCount} signups</Text>
                </InlineStack>
                <InlineStack gap="200" align="center">
                  <CalendarIcon />
                  <Text variant="bodyMd">
                    Created {new Date(campaign.createdAt).toLocaleDateString()}
                  </Text>
                </InlineStack>
                {campaign.expiresAt && (
                  <InlineStack gap="200" align="center">
                    <AlertTriangleIcon />
                    <Text variant="bodyMd">
                      Expires {new Date(campaign.expiresAt).toLocaleDateString()}
                    </Text>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    );
  };

  // Render signups table
  const renderSignups = () => {
    const signupRows = campaign.signups.map((signup) => [
      signup.email,
      signup.firstName || "-",
      signup.lastName || "-",
      signup.phone || "-",
      new Date(signup.createdAt).toLocaleDateString(),
      <InlineStack key="status" gap="100">
        {signup.klaviyoSynced && <Badge status="success">Klaviyo</Badge>}
        {signup.omnisendSynced && <Badge status="success">Omnisend</Badge>}
        {signup.syncError && <Badge status="critical">Sync Error</Badge>}
      </InlineStack>,
    ]);

    return (
      <Card>
        <BlockStack gap="300">
          <Text variant="headingMd" as="h2">
            Signups ({campaign.signupCount})
          </Text>
          {campaign.signups.length === 0 ? (
            <EmptyState
              heading="No signups yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Signups will appear here when customers join your campaign.</p>
            </EmptyState>
          ) : (
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text", "text"]}
              headings={["Email", "First Name", "Last Name", "Phone", "Signed Up", "Sync Status"]}
              rows={signupRows}
            />
          )}
        </BlockStack>
      </Card>
    );
  };

  // Render gated pages
  const renderGatedPages = () => {
    return (
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h2">
              Gated Pages ({campaign.gatedPages.length})
            </Text>
            <Button
              primary
              icon={PlusIcon}
              onClick={() => setIsGatedPageModalOpen(true)}
            >
              Create Page
            </Button>
          </InlineStack>

          {campaign.gatedPages.length === 0 ? (
            <EmptyState
              heading="No gated pages yet"
              action={{
                content: "Create your first page",
                onAction: () => setIsGatedPageModalOpen(true),
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Create gated pages to showcase your early access content.</p>
            </EmptyState>
          ) : (
            <ResourceList
              items={campaign.gatedPages}
              renderItem={(page) => {
                const { id, title, slug, isActive, createdAt } = page;
                const url = CampaignUtils.generateGatedPageUrl(slug, process.env.SHOPIFY_APP_URL);

                return (
                  <ResourceItem
                    id={id}
                    url={`/early-access/${slug}`}
                    external
                    media={
                      <Thumbnail
                        source="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        alt="Page thumbnail"
                      />
                    }
                    accessibilityLabel={`View ${title}`}
                  >
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">
                          {title}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          /{slug}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          Created {new Date(createdAt).toLocaleDateString()}
                        </Text>
                      </BlockStack>
                      <InlineStack gap="100">
                        <Badge status={isActive ? "success" : "critical"}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          size="slim"
                          icon={DuplicateIcon}
                          onClick={() => handleCopy(url, "Page URL copied!")}
                        >
                          Copy URL
                        </Button>
                        <Button
                          size="slim"
                          icon={EditIcon}
                          onClick={() => {
                            setEditingGatedPage(page);
                            setIsGatedPageModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="slim"
                          icon={DeleteIcon}
                          destructive
                          onClick={() => {
                            if (confirm(`Delete "${title}"?`)) {
                              fetcher.submit(
                                { action: "deleteGatedPage", pageId: id },
                                { method: "post" }
                              );
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </ResourceItem>
                );
              }}
            />
          )}
        </BlockStack>
      </Card>
    );
  };

  const tabs = [
    {
      id: "overview",
      content: "Overview",
      panelID: "overview-panel",
    },
    {
      id: "signups",
      content: "Signups",
      panelID: "signups-panel",
    },
    {
      id: "pages",
      content: "Gated Pages",
      panelID: "pages-panel",
    },
  ];

  return (
    <Page>
      <TitleBar
        title={campaign.name}
        breadcrumbs={[
          { content: "Campaigns", url: "/app/campaigns" },
        ]}
      />

      <Layout>
        <Layout.Section>
          <Tabs
            tabs={tabs}
            selected={selectedTab}
            onSelect={setSelectedTab}
          >
            <TabsPanel id="overview-panel">
              {renderOverview()}
            </TabsPanel>
            <TabsPanel id="signups-panel">
              {renderSignups()}
            </TabsPanel>
            <TabsPanel id="pages-panel">
              {renderGatedPages()}
            </TabsPanel>
          </Tabs>
        </Layout.Section>
      </Layout>

      {/* Edit Campaign Modal */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Campaign"
        primaryAction={{
          content: "Save Changes",
          onAction: () => {
            // Handle form submission
            setIsEditModalOpen(false);
          },
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsEditModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Campaign Name"
              name="name"
              defaultValue={campaign.name}
            />
            <TextField
              label="Description"
              name="description"
              defaultValue={campaign.description || ""}
              multiline={3}
            />
            <TextField
              label="Custom Message"
              name="customMessage"
              defaultValue={campaign.customMessage || ""}
              multiline={2}
            />
            <TextField
              label="Redirect URL"
              name="redirectUrl"
              defaultValue={campaign.redirectUrl || ""}
            />
            <TextField
              label="Klaviyo List ID"
              name="klaviyoListId"
              defaultValue={campaign.klaviyoListId || ""}
            />
            <TextField
              label="Omnisend List ID"
              name="omnisendListId"
              defaultValue={campaign.omnisendListId || ""}
            />
            <TextField
              label="Tag Name"
              name="tagName"
              defaultValue={campaign.tagName || "VIP Early Access"}
            />
            <Checkbox
              label="Active"
              name="isActive"
              checked={campaign.isActive}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Create/Edit Gated Page Modal */}
      <Modal
        open={isGatedPageModalOpen}
        onClose={() => {
          setIsGatedPageModalOpen(false);
          setEditingGatedPage(null);
        }}
        title={editingGatedPage ? "Edit Gated Page" : "Create Gated Page"}
        primaryAction={{
          content: editingGatedPage ? "Save Changes" : "Create Page",
          onAction: () => {
            // Handle form submission
            setIsGatedPageModalOpen(false);
            setEditingGatedPage(null);
          },
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => {
              setIsGatedPageModalOpen(false);
              setEditingGatedPage(null);
            },
          },
        ]}
        large
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Page Title"
              name="title"
              defaultValue={editingGatedPage?.title || ""}
              required
            />
            <TextField
              label="Meta Title"
              name="metaTitle"
              defaultValue={editingGatedPage?.metaTitle || ""}
              helpText="SEO title for search engines"
            />
            <TextField
              label="Meta Description"
              name="metaDescription"
              defaultValue={editingGatedPage?.metaDescription || ""}
              multiline={2}
              helpText="SEO description for search engines"
            />
            <TextField
              label="Content"
              name="content"
              defaultValue={editingGatedPage?.content || ""}
              multiline={10}
              helpText="HTML content for the page"
              required
            />
            {editingGatedPage && (
              <Checkbox
                label="Active"
                name="isActive"
                checked={editingGatedPage.isActive}
              />
            )}
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
