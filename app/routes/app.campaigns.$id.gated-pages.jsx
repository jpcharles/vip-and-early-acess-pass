import { useState, useCallback } from "react";
import { useLoaderData, useActionData, useNavigate, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  Text,
  TextField,
  Banner,
  FormLayout,
  ButtonGroup,
  Thumbnail,
  ResourceList,
  ResourceItem,
  Heading,
  Modal,
  EmptyState,
} from "@shopify/polaris";
import {
  PlusIcon,
  DeleteIcon,
  ExternalIcon,
  LinkIcon,
  ArrowLeftIcon,
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

  if (action === "create") {
    const title = formData.get("title");
    const content = formData.get("content");
    const slug = formData.get("slug");
    const metaTitle = formData.get("metaTitle");
    const metaDescription = formData.get("metaDescription");

    if (!title || !content || !slug) {
      return json({ error: "Title, content, and slug are required" }, { status: 400 });
    }

    // Check if slug already exists
    const existingPage = await prisma.gatedPage.findUnique({
      where: { slug },
    });

    if (existingPage) {
      return json({ error: "Slug already exists" }, { status: 400 });
    }

    try {
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
    } catch (error) {
      console.error("Error creating gated page:", error);
      return json({ error: "Failed to create gated page" }, { status: 500 });
    }
  }

  if (action === "delete") {
    const pageId = formData.get("pageId");

    try {
      await prisma.gatedPage.delete({
        where: { id: pageId },
      });

      return json({ success: true });
    } catch (error) {
      console.error("Error deleting gated page:", error);
      return json({ error: "Failed to delete gated page" }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function CampaignGatedPages() {
  const { campaign } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    slug: "",
    metaTitle: "",
    metaDescription: "",
  });

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-generate slug from title
    if (field === "title") {
      const slug = CampaignUtils.generateSlug(value);
      setFormData(prev => ({ ...prev, slug }));
    }
  }, []);

  const handleCreate = () => {
    fetcher.submit(
      {
        action: "create",
        ...formData
      },
      { method: "POST" }
    );
  };

  const handleDelete = (pageId) => {
    if (confirm("Are you sure you want to delete this gated page?")) {
      fetcher.submit(
        { action: "delete", pageId },
        { method: "POST" }
      );
    }
  };

  const getGatedPageUrl = (slug) => {
    return `${process.env.SHOPIFY_APP_URL}/early-access/${slug}`;
  };

  return (
    <Page>
      <TitleBar title={`${campaign.name} - Gated Pages`}>
        <ButtonGroup>
          <Button onClick={() => navigate(`/app/campaigns/${campaign.id}`)} icon={ArrowLeftIcon}>
            Back to Campaign
          </Button>
          <Button primary onClick={() => setShowCreateModal(true)} icon={PlusIcon}>
            Create Gated Page
          </Button>
        </ButtonGroup>
      </TitleBar>

      {actionData?.error && (
        <Banner status="critical">
          {actionData.error}
        </Banner>
      )}

      {actionData?.success && (
        <Banner status="success">
          Gated page created successfully!
        </Banner>
      )}

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
          </BlockStack>
        </Card>

        {/* Gated Pages List */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingMd">Gated Pages ({campaign.gatedPages.length})</Text>
            </InlineStack>

            {campaign.gatedPages.length === 0 ? (
              <EmptyState
                heading="No gated pages yet"
                action={{
                  content: 'Create your first gated page',
                  onAction: () => setShowCreateModal(true),
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Create gated pages to showcase your early access products and collections.</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: 'page', plural: 'pages' }}
                items={campaign.gatedPages}
                renderItem={(page) => (
                  <ResourceItem
                    id={page.id}
                  >
                    <InlineStack gap="400" align="space-between">
                      <InlineStack gap="300">
                        <Thumbnail
                          source={LinkIcon}
                          alt="Gated Page"
                          size="small"
                        />
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="bold">
                            {page.title}
                          </Text>
                          <Text variant="bodySm" color="subdued">
                            /{page.slug}
                          </Text>
                          <InlineStack gap="200">
                            <Badge status={page.isActive ? "success" : "critical"}>
                              {page.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Text variant="bodySm">
                              Created {new Date(page.createdAt).toLocaleDateString()}
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Button
                          size="slim"
                          onClick={() => window.open(getGatedPageUrl(page.slug), '_blank')}
                          icon={ExternalIcon}
                        >
                          View
                        </Button>
                        <Button
                          size="slim"
                          onClick={() => handleDelete(page.id)}
                          icon={DeleteIcon}
                          destructive
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </ResourceItem>
                )}
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>

      {/* Create Gated Page Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Gated Page"
        primaryAction={{
          content: "Create Page",
          onAction: handleCreate,
          loading: fetcher.state === "submitting",
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowCreateModal(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Page Title"
              value={formData.title}
              onChange={(value) => handleInputChange("title", value)}
              placeholder="e.g., VIP Early Access - New Collection"
              required
            />

            <TextField
              label="Slug"
              value={formData.slug}
              onChange={(value) => handleInputChange("slug", value)}
              placeholder="e.g., vip-early-access-new-collection"
              required
            />

            <TextField
              label="Page Content"
              value={formData.content}
              onChange={(value) => handleInputChange("content", value)}
              placeholder="Enter HTML content for the gated page"
              multiline={10}
              required
            />

            <TextField
              label="Meta Title"
              value={formData.metaTitle}
              onChange={(value) => handleInputChange("metaTitle", value)}
              placeholder="SEO title for the page"
            />

            <TextField
              label="Meta Description"
              value={formData.metaDescription}
              onChange={(value) => handleInputChange("metaDescription", value)}
              placeholder="SEO description for the page"
              multiline={3}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
