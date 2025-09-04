import { useLoaderData, useNavigate } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  DataTable,
  EmptyState,
  Icon,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { PlusIcon, ViewIcon, EditIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const campaigns = await db.earlyAccessCampaign.findMany({
    where: { shop: session.shop },
    include: {
      _count: {
        select: { signups: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return json({ campaigns });
};

export default function Index() {
  const { campaigns } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const campaignRows = campaigns.map((campaign) => [
    campaign.name,
    campaign.targetType === "product" ? "Product" : "Collection",
    campaign.isActive ? <Badge status="success">Active</Badge> : <Badge>Inactive</Badge>,
    campaign._count.signups.toString(),
    new Date(campaign.createdAt).toLocaleDateString(),
    <InlineStack gap="200">
      <Button
        size="micro"
        icon={ViewIcon}
        onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
      >
        View
      </Button>
      <Button
        size="micro"
        icon={EditIcon}
        onClick={() => navigate(`/app/campaigns/${campaign.id}/edit`)}
      >
        Edit
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page>
      <TitleBar title="Early Access Pass" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <InlineStack align="space-between">
              <Text variant="headingLg" as="h1">
                VIP Early Access Campaigns
              </Text>
              <Button
                primary
                icon={PlusIcon}
                onClick={() => navigate("/app/campaigns/new")}
              >
                Create Campaign
              </Button>
            </InlineStack>

            <Card>
              {campaigns.length === 0 ? (
                <EmptyState
                  heading="Create your first early access campaign"
                  action={{
                    content: "Create Campaign",
                    onAction: () => navigate("/app/campaigns/new"),
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Set up gated product or collection pages with secret links.
                    Perfect for VIP customers and exclusive product launches.
                  </p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text", 
                    "text",
                    "numeric",
                    "text",
                    "text"
                  ]}
                  headings={[
                    "Campaign Name",
                    "Type",
                    "Status", 
                    "Signups",
                    "Created",
                    "Actions"
                  ]}
                  rows={campaignRows}
                />
              )}
            </Card>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Quick Stats
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text>Total Campaigns:</Text>
                      <Text variant="bodyMd" fontWeight="semibold">
                        {campaigns.length}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Active Campaigns:</Text>
                      <Text variant="bodyMd" fontWeight="semibold">
                        {campaigns.filter(c => c.isActive).length}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Total Signups:</Text>
                      <Text variant="bodyMd" fontWeight="semibold">
                        {campaigns.reduce((sum, c) => sum + c._count.signups, 0)}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
