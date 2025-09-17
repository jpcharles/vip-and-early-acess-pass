import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();

  const product = responseJson.data!.productCreate!.product!;
  const variantId = product.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  };
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();

  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  // const { stats, recentCampaigns } = useLoaderData<typeof loader>();

  const statsCards = [
    {
      title: "Total Campaigns",
      value: 0, //stats.totalCampaigns,
    },
    {
      title: "Total Email Templates", 
      value: 0, //stats.activeCampaigns,
    },
  ];


  return (
    <Page>
      <TitleBar title="Vip Early Access Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to Early Access Pass
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Create exclusive VIP early access campaigns for your products and collections.
                    Gate content behind passwords, secret links, or email signups, and automatically
                    sync signups to Klaviyo and Omnisend.
                  </Text>
                </BlockStack>

                <InlineStack gap="300">
                  <Button url="/app/campaigns/new" variant="primary">
                    Create New Campaign
                  </Button>
                  <Button url="/app/campaigns" variant="primary">
                    View All Campaigns
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Campaign Statistics
                </Text>
                <InlineStack gap="400" wrap={false} align="space-evenly">
                  {statsCards.map((stat, index) => (
                    <Box key={index} padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="200px">
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingLg">
                          {stat.value}
                        </Text>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {stat.title}
                        </Text>
                      </BlockStack>
                    </Box>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

      </BlockStack>
    </Page>
  );
}
