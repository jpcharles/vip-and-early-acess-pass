import { useState, useEffect } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate, useParams } from "@remix-run/react";
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
  Divider,
  Box,
  Link,
  Icon,
  Tooltip,
  Thumbnail,
  ResourceList,
  ResourceItem,
  Avatar,
  Stack,
  CalloutCard,
  DisplayText,
  Subheading,
  Caption,
  Toast,
  Frame,
  Tabs,
  ProgressBar,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { PrismaClient } from "@prisma/client";
import { 
  EditIcon, 
  DeleteIcon, 
  ViewIcon, 
  CopyIcon, 
  ExternalIcon,
  AnalyticsIcon,
  EmailIcon,
  KeyIcon,
  LinkIcon,
  StarIcon,
  LockIcon,
  ViewMinor,
  EditMinor,
  DeleteMinor,
  CopyMinor,
} from "@shopify/polaris-icons";

const prisma = new PrismaClient();

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const campaignId = params.id;
  
  try {
    const campaign = await prisma.earlyAccessCampaign.findFirst({
      where: { 
        id: campaignId,
        shop: session.shop 
      },
      include: {
        signups: {
          orderBy: { createdAt: 'desc' }
        },
      },
    });

    if (!campaign) {
      throw new Response("Campaign not found", { status: 404 });
    }

    return json({ campaign });
  } catch (error) {
    console.error('Error loading campaign:', error);
    throw new Response("Failed to load campaign", { status: 500 });
  }
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const campaignId = params.id;

  try {
    switch (action) {
      case "delete": {
        await prisma.earlyAccessCampaign.delete({
          where: { id: campaignId },
        });
        return redirect("/app");
      }

      case "toggle": {
        const isActive = formData.get("isActive") === "true";
        
        await prisma.earlyAccessCampaign.update({
          where: { id: campaignId },
          data: { isActive: !isActive },
        });
        return json({ success: true });
      }

      case "regenerate_link": {
        const newSecretLink = `https://${session.shop}/pages/early-access-${Date.now()}`;
        
        await prisma.earlyAccessCampaign.update({
          where: { id: campaignId },
          data: { secretLink: newSecretLink },
        });
        return json({ success: true, newSecretLink });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in action:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

export default function CampaignDetail() {
  const { campaign } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const params = useParams();
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.newSecretLink) {
      setToastActive(true);
      setToastMessage("Secret link regenerated successfully!");
    }
  }, [fetcher.data]);

  const handleDeleteCampaign = () => {
    const formData = new FormData();
    formData.append("action", "delete");
    fetcher.submit(formData, { method: "post" });
  };

  const handleToggleCampaign = () => {
    const formData = new FormData();
    formData.append("action", "toggle");
    formData.append("isActive", campaign.isActive.toString());
    fetcher.submit(formData, { method: "post" });
  };

  const handleRegenerateLink = () => {
    const formData = new FormData();
    formData.append("action", "regenerate_link");
    fetcher.submit(formData, { method: "post" });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToastActive(true);
    setToastMessage("Link copied to clipboard!");
  };

  const getAccessTypeIcon = (type) => {
    switch (type) {
      case "PASSWORD": return KeyIcon;
      case "SECRET_LINK": return LinkIcon;
      case "EMAIL_SIGNUP": return EmailIcon;
      case "PASSWORD_OR_EMAIL": return StarIcon;
      default: return LockIcon;
    }
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

  const signupRows = campaign.signups.map((signup) => [
    <Text variant="bodyMd" as="p">
      {signup.email}
    </Text>,
    <Text variant="bodyMd" as="p">
      {signup.firstName} {signup.lastName}
    </Text>,
    <Text variant="bodyMd" as="p">
      {new Date(signup.createdAt).toLocaleDateString()}
    </Text>,
    <InlineStack gap="200">
      <Badge status={signup.klaviyoSynced ? "success" : "attention"}>
        Klaviyo {signup.klaviyoSynced ? "Synced" : "Pending"}
      </Badge>
      <Badge status={signup.omnisendSynced ? "success" : "attention"}>
        Omnisend {signup.omnisendSynced ? "Synced" : "Pending"}
      </Badge>
    </InlineStack>,
  ]);

  const tabs = [
    {
      id: "overview",
      content: "Overview",
      icon: AnalyticsIcon,
    },
    {
      id: "signups",
      content: `Signups (${campaign.signups.length})`,
      icon: EmailIcon,
    },
    {
      id: "settings",
      content: "Settings",
      icon: EditIcon,
    },
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
        title={campaign.name}
        subtitle={campaign.description}
        breadcrumbs={[
          { content: "Campaigns", url: "/app" },
        ]}
        primaryAction={{
          content: "Edit Campaign",
          icon: EditIcon,
          onAction: () => navigate(`/app/campaigns/${campaign.id}/edit`),
        }}
        secondaryActions={[
          {
            content: campaign.isActive ? "Deactivate" : "Activate",
            onAction: handleToggleCampaign,
          },
          {
            content: "Delete",
            destructive: true,
            onAction: () => setIsDeleteModalOpen(true),
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Tabs
              tabs={tabs}
              selected={selectedTab}
              onSelect={setSelectedTab}
            >
              {/* Overview Tab */}
              {selectedTab === 0 && (
                <BlockStack gap="500">
                  {/* Campaign Status */}
                  <Card>
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h2">
                          Campaign Status
                        </Text>
                        <Badge 
                          status={campaign.isActive ? "success" : "critical"}
                          icon={getAccessTypeIcon(campaign.accessType)}
                        >
                          {campaign.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </InlineStack>
                      
                      <Text variant="bodyLg" as="p">
                        {getAccessTypeLabel(campaign.accessType)}
                      </Text>
                      
                      {campaign.password && (
                        <Box>
                          <Text variant="bodyMd" fontWeight="bold" as="p">
                            Password: {campaign.password}
                          </Text>
                        </Box>
                      )}
                      
                      {campaign.secretLink && (
                        <Box>
                          <InlineStack gap="200">
                            <TextField
                              label="Secret Link"
                              value={campaign.secretLink}
                              readOnly
                              connectedRight={
                                <Button
                                  icon={CopyIcon}
                                  onClick={() => copyToClipboard(campaign.secretLink)}
                                >
                                  Copy
                                </Button>
                              }
                            />
                            <Button
                              icon={ExternalIcon}
                              onClick={() => window.open(campaign.secretLink, '_blank')}
                            >
                              View
                            </Button>
                            <Button
                              onClick={handleRegenerateLink}
                              loading={fetcher.state === "submitting"}
                            >
                              Regenerate
                            </Button>
                          </InlineStack>
                        </Box>
                      )}
                    </BlockStack>
                  </Card>

                  {/* Analytics */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">
                        Analytics
                      </Text>
                      
                      <InlineStack gap="500">
                        <Box>
                          <DisplayText size="large" as="h3">
                            {campaign.totalViews}
                          </DisplayText>
                          <Caption>Total Views</Caption>
                        </Box>
                        <Box>
                          <DisplayText size="large" as="h3">
                            {campaign.totalSignups}
                          </DisplayText>
                          <Caption>Total Signups</Caption>
                        </Box>
                        <Box>
                          <DisplayText size="large" as="h3">
                            {campaign.totalViews > 0 
                              ? Math.round((campaign.totalSignups / campaign.totalViews) * 100)
                              : 0}%
                          </DisplayText>
                          <Caption>Conversion Rate</Caption>
                        </Box>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  {/* Email Integration */}
                  {(campaign.klaviyoListId || campaign.omnisendListId) && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingMd" as="h2">
                          Email Integration
                        </Text>
                        
                        <InlineStack gap="400">
                          {campaign.klaviyoListId && (
                            <Box>
                              <Text variant="bodyMd" fontWeight="bold" as="p">
                                Klaviyo List ID
                              </Text>
                              <Text variant="bodyMd" as="p">
                                {campaign.klaviyoListId}
                              </Text>
                            </Box>
                          )}
                          
                          {campaign.omnisendListId && (
                            <Box>
                              <Text variant="bodyMd" fontWeight="bold" as="p">
                                Omnisend List ID
                              </Text>
                              <Text variant="bodyMd" as="p">
                                {campaign.omnisendListId}
                              </Text>
                            </Box>
                          )}
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  )}
                </BlockStack>
              )}

              {/* Signups Tab */}
              {selectedTab === 1 && (
                <Card>
                  {campaign.signups.length === 0 ? (
                    <EmptyState
                      heading="No signups yet"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Signups will appear here once customers start joining your VIP list.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={[
                        "text",
                        "text",
                        "text",
                        "text",
                      ]}
                      headings={[
                        "Email",
                        "Name",
                        "Signup Date",
                        "Sync Status",
                      ]}
                      rows={signupRows}
                    />
                  )}
                </Card>
              )}

              {/* Settings Tab */}
              {selectedTab === 2 && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Campaign Settings
                    </Text>
                    
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
                        multiline={3}
                      />
                      
                      <Select
                        label="Access Type"
                        options={[
                          { label: "Password Protected", value: "PASSWORD" },
                          { label: "Secret Link", value: "SECRET_LINK" },
                          { label: "Email Signup", value: "EMAIL_SIGNUP" },
                          { label: "Password or Email", value: "PASSWORD_OR_EMAIL" },
                        ]}
                        value={campaign.accessType}
                        readOnly
                      />
                      
                      <TextField
                        label="Created"
                        value={new Date(campaign.createdAt).toLocaleString()}
                        readOnly
                      />
                      
                      <TextField
                        label="Last Updated"
                        value={new Date(campaign.updatedAt).toLocaleString()}
                        readOnly
                      />
                    </FormLayout>
                  </BlockStack>
                </Card>
              )}
            </Tabs>
          </Layout.Section>
        </Layout>

        {/* Delete Confirmation Modal */}
        <Modal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Campaign"
          primaryAction={{
            content: "Delete",
            destructive: true,
            onAction: handleDeleteCampaign,
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
              Are you sure you want to delete "{campaign.name}"? This action cannot be undone and will remove all associated signups.
            </Text>
          </Modal.Section>
        </Modal>

        {toastMarkup}
      </Page>
    </Frame>
  );
}
