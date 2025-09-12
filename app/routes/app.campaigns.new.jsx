import { useState, useCallback } from "react";
import { useLoaderData, useActionData, useNavigate, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  TextField,
  Select,
  Checkbox,
  Banner,
  FormLayout,
  ButtonGroup,
  Box,
  Thumbnail,
  ResourceList,
  ResourceItem,
  Modal,
  BlockStack,
  InlineStack,
} from '@shopify/polaris';

import pkg from '@shopify/polaris';



import {
  ProductIcon,
  CollectionIcon,
  ArrowLeftIcon,
  SaveIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json, redirect } from "@remix-run/node";
import prisma from "../db.server";
import { CampaignUtils } from "../lib/campaign-utils";

const { Heading } = pkg;

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Fetch products and collections from Shopify
  const productsResponse = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `, {
    variables: { first: 50 }
  });

  const collectionsResponse = await admin.graphql(`
    query getCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            image {
              url
              altText
            }
          }
        }
      }
    }
  `, {
    variables: { first: 50 }
  });

  const productsData = await productsResponse.json();
  const collectionsData = await collectionsResponse.json();

  return json({
    products: productsData.data.products.edges.map(edge => ({
      id: edge.node.id.replace('gid://shopify/Product/', ''),
      title: edge.node.title,
      handle: edge.node.handle,
      image: edge.node.images.edges[0]?.node?.url || null,
    })),
    collections: collectionsData.data.collections.edges.map(edge => ({
      id: edge.node.id.replace('gid://shopify/Collection/', ''),
      title: edge.node.title,
      handle: edge.node.handle,
      image: edge.node.image?.url || null,
    })),
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const name = formData.get("name");
  const description = formData.get("description");
  const accessType = formData.get("accessType");
  const password = formData.get("password");
  const productIds = JSON.parse(formData.get("productIds") || "[]");
  const collectionIds = JSON.parse(formData.get("collectionIds") || "[]");
  const klaviyoListId = formData.get("klaviyoListId");
  const omnisendListId = formData.get("omnisendListId");
  const tagName = formData.get("tagName") || "VIP Early Access";
  const customMessage = formData.get("customMessage");
  const redirectUrl = formData.get("redirectUrl");
  const expiresAt = formData.get("expiresAt");
  const isActive = formData.get("isActive") === "true";

  // Validate required fields
  if (!name || !accessType) {
    return json({ error: "Name and access type are required" }, { status: 400 });
  }

  // Hash password if provided
  let hashedPassword = null;
  if (password && (accessType === "PASSWORD" || accessType === "PASSWORD_OR_SIGNUP")) {
    hashedPassword = await CampaignUtils.hashPassword(password);
  }

  // Generate secret link if needed
  let secretLink = null;
  if (accessType === "SECRET_LINK") {
    secretLink = CampaignUtils.generateSecretLink();
  }

  try {
    const campaign = await prisma.earlyAccessCampaign.create({
      data: {
        shop: session.shop,
        name,
        description,
        accessType,
        password: hashedPassword,
        secretLink,
        productIds,
        collectionIds,
        klaviyoListId,
        omnisendListId,
        autoTagEnabled: true,
        tagName,
        customMessage,
        redirectUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
      },
    });

    return redirect(`/app/campaigns/${campaign.id}`);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return json({ error: "Failed to create campaign" }, { status: 500 });
  }
};

export default function NewCampaign() {
  const { products, collections } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    accessType: "PASSWORD",
    password: "",
    productIds: [],
    collectionIds: [],
    klaviyoListId: "",
    omnisendListId: "",
    tagName: "VIP Early Access",
    customMessage: "",
    redirectUrl: "",
    expiresAt: "",
    isActive: true,
  });

  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);

  const accessTypeOptions = [
    { label: "Password Protected", value: "PASSWORD" },
    { label: "Secret Link", value: "SECRET_LINK" },
    { label: "Email Signup", value: "EMAIL_SIGNUP" },
    { label: "Password or Signup", value: "PASSWORD_OR_SIGNUP" },
  ];

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleProductToggle = useCallback((productId) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  }, []);

  const handleCollectionToggle = useCallback((collectionId) => {
    setFormData(prev => ({
      ...prev,
      collectionIds: prev.collectionIds.includes(collectionId)
        ? prev.collectionIds.filter(id => id !== collectionId)
        : [...prev.collectionIds, collectionId]
    }));
  }, []);

  const selectedProducts = products.filter(p => formData.productIds.includes(p.id));
  const selectedCollections = collections.filter(c => formData.collectionIds.includes(c.id));

  return (
    <Page>
      <TitleBar title="Create Campaign">
        <ButtonGroup>
          <Button onClick={() => navigate("/app/campaigns")} icon={ArrowLeftIcon}>
            Back
          </Button>
        </ButtonGroup>
      </TitleBar>

      {actionData?.error && (
        <Banner status="critical">
          {actionData.error}
        </Banner>
      )}

      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Heading>Campaign Details</Heading>
              
              <FormLayout>
                <TextField
                  label="Campaign Name"
                  value={formData.name}
                  onChange={(value) => handleInputChange("name", value)}
                  placeholder="e.g., VIP Early Access - New Collection"
                  required
                />

                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={(value) => handleInputChange("description", value)}
                  placeholder="Describe your early access campaign"
                  multiline={3}
                />

                <Select
                  label="Access Type"
                  options={accessTypeOptions}
                  value={formData.accessType}
                  onChange={(value) => handleInputChange("accessType", value)}
                />

                {(formData.accessType === "PASSWORD" || formData.accessType === "PASSWORD_OR_SIGNUP") && (
                  <TextField
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(value) => handleInputChange("password", value)}
                    placeholder="Enter password for access"
                    required
                  />
                )}

                <TextField
                  label="Custom Message"
                  value={formData.customMessage}
                  onChange={(value) => handleInputChange("customMessage", value)}
                  placeholder="Custom message shown to users"
                  multiline={2}
                />

                <TextField
                  label="Redirect URL"
                  value={formData.redirectUrl}
                  onChange={(value) => handleInputChange("redirectUrl", value)}
                  placeholder="URL to redirect after successful access"
                />

                <TextField
                  label="Expiration Date"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(value) => handleInputChange("expiresAt", value)}
                />

                <Checkbox
                  label="Active"
                  checked={formData.isActive}
                  onChange={(checked) => handleInputChange("isActive", checked)}
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Heading>Products & Collections</Heading>
              
              <InlineStack gap="300">
                <Button
                  onClick={() => setShowProductSelector(true)}
                  icon={ProductIcon}
                >
                  Select Products ({formData.productIds.length})
                </Button>
                <Button
                  onClick={() => setShowCollectionSelector(true)}
                  icon={CollectionIcon}
                >
                  Select Collections ({formData.collectionIds.length})
                </Button>
              </InlineStack>

              {selectedProducts.length > 0 && (
                <BlockStack gap="200">
                  <Text variant="headingSm">Selected Products:</Text>
                  <ResourceList
                    resourceName={{ singular: 'product', plural: 'products' }}
                    items={selectedProducts}
                    renderItem={(product) => (
                      <ResourceItem
                        id={product.id}
                        onClick={() => handleProductToggle(product.id)}
                      >
                        <InlineStack gap="300">
                          {product.image && (
                            <Thumbnail
                              source={product.image}
                              alt={product.title}
                              size="small"
                            />
                          )}
                          <Text variant="bodyMd">{product.title}</Text>
                        </InlineStack>
                      </ResourceItem>
                    )}
                  />
                </BlockStack>
              )}

              {selectedCollections.length > 0 && (
                <BlockStack gap="200">
                  <Text variant="headingSm">Selected Collections:</Text>
                  <ResourceList
                    resourceName={{ singular: 'collection', plural: 'collections' }}
                    items={selectedCollections}
                    renderItem={(collection) => (
                      <ResourceItem
                        id={collection.id}
                        onClick={() => handleCollectionToggle(collection.id)}
                      >
                        <InlineStack gap="300">
                          {collection.image && (
                            <Thumbnail
                              source={collection.image}
                              alt={collection.title}
                              size="small"
                            />
                          )}
                          <Text variant="bodyMd">{collection.title}</Text>
                        </InlineStack>
                      </ResourceItem>
                    )}
                  />
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Heading>Email Marketing Integration</Heading>
              
              <FormLayout>
                <TextField
                  label="Klaviyo List ID"
                  value={formData.klaviyoListId}
                  onChange={(value) => handleInputChange("klaviyoListId", value)}
                  placeholder="Enter Klaviyo list ID for auto-sync"
                />

                <TextField
                  label="Omnisend List ID"
                  value={formData.omnisendListId}
                  onChange={(value) => handleInputChange("omnisendListId", value)}
                  placeholder="Enter Omnisend list ID for auto-sync"
                />

                <TextField
                  label="Tag Name"
                  value={formData.tagName}
                  onChange={(value) => handleInputChange("tagName", value)}
                  placeholder="Tag name for signups"
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Product Selection Modal */}
      <Modal
        open={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        title="Select Products"
        primaryAction={{
          content: "Done",
          onAction: () => setShowProductSelector(false),
        }}
      >
        <Modal.Section>
          <ResourceList
            resourceName={{ singular: 'product', plural: 'products' }}
            items={products}
            renderItem={(product) => (
              <ResourceItem
                id={product.id}
                onClick={() => handleProductToggle(product.id)}
              >
                <InlineStack gap="300">
                  <Checkbox
                    checked={formData.productIds.includes(product.id)}
                    onChange={() => handleProductToggle(product.id)}
                  />
                  {product.image && (
                    <Thumbnail
                      source={product.image}
                      alt={product.title}
                      size="small"
                    />
                  )}
                  <Text variant="bodyMd">{product.title}</Text>
                </InlineStack>
              </ResourceItem>
            )}
          />
        </Modal.Section>
      </Modal>

      {/* Collection Selection Modal */}
      <Modal
        open={showCollectionSelector}
        onClose={() => setShowCollectionSelector(false)}
        title="Select Collections"
        primaryAction={{
          content: "Done",
          onAction: () => setShowCollectionSelector(false),
        }}
      >
        <Modal.Section>
          <ResourceList
            resourceName={{ singular: 'collection', plural: 'collections' }}
            items={collections}
            renderItem={(collection) => (
              <ResourceItem
                id={collection.id}
                onClick={() => handleCollectionToggle(collection.id)}
              >
                <InlineStack gap="300">
                  <Checkbox
                    checked={formData.collectionIds.includes(collection.id)}
                    onChange={() => handleCollectionToggle(collection.id)}
                  />
                  {collection.image && (
                    <Thumbnail
                      source={collection.image}
                      alt={collection.title}
                      size="small"
                    />
                  )}
                  <Text variant="bodyMd">{collection.title}</Text>
                </InlineStack>
              </ResourceItem>
            )}
          />
        </Modal.Section>
      </Modal>

      {/* Save Button */}
      <Box padding="400">
        <InlineStack align="end">
          <Button
            primary
            size="large"
            icon={SaveIcon}
            submit
          >
            Create Campaign
          </Button>
        </InlineStack>
      </Box>
    </Page>
  );
}
