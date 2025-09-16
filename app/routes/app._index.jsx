import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  Box,
  List,
  Link,
  BlockStack,
  InlineStack,
  Badge,
  ResourceList,
  ResourceItem,
  EmptyState,
  Thumbnail,
} from '@shopify/polaris';
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import { CampaignUtils } from "../lib/campaign-utils";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // Get campaign statistics
  const [totalCampaigns, activeCampaigns, totalSignups, recentCampaigns] = await Promise.all([
    prisma.earlyAccessCampaign.count({
      where: { shop: session.shop }
    }),
    prisma.earlyAccessCampaign.count({
      where: { shop: session.shop, isActive: true }
    }),
    prisma.earlyAccessSignup.count({
      where: {
        campaign: { shop: session.shop }
      }
    }),
    prisma.earlyAccessCampaign.findMany({
      where: { shop: session.shop },
      include: {
        signups: true,
        gatedPages: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
  ]);

  const formattedCampaigns = recentCampaigns.map(CampaignUtils.formatCampaignForDisplay);

  return json({
    stats: {
      totalCampaigns,
      activeCampaigns,
      totalSignups,
    },
    recentCampaigns: formattedCampaigns,
  });
};

export default function Index() {
  const { stats, recentCampaigns } = useLoaderData();

  const statsCards = [
    {
      title: "Total Campaigns",
      value: stats.totalCampaigns,
      description: "All time campaigns",
    },
    {
      title: "Active Campaigns", 
      value: stats.activeCampaigns,
      description: "Currently running",
    },
    {
      title: "Total Signups",
      value: stats.totalSignups,
      description: "Email addresses collected",
    },
  ];

  return (
    <Page>
      <TitleBar title="Early Access Pass Dashboard" />
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
                  <Button url="/app/campaigns/new" primary>
                    Create New Campaign
                  </Button>
                  <Button url="/app/campaigns" primary>
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
                <InlineStack gap="400" wrap={false}>
                  {statsCards.map((stat, index) => (
                    <Box key={index} padding="400" background="bg-surface-secondary" borderRadius="200" minWidth="200px">
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingLg">
                          {stat.value}
                        </Text>
                        <Text variant="bodyMd" fontWeight="semibold">
                          {stat.title}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {stat.description}
                        </Text>
                      </BlockStack>
                    </Box>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Recent Campaigns
                  </Text>
                  <Button url="/app/campaigns" variant="plain">
                    View All
                  </Button>
                </InlineStack>
                
                {recentCampaigns.length === 0 ? (
                  <EmptyState
                    heading="No campaigns yet"
                    action={{
                      content: "Create your first campaign",
                      url: "/app/campaigns/new",
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Start by creating an early access campaign for your products.</p>
                  </EmptyState>
                ) : (
                  <ResourceList
                    items={recentCampaigns}
                    renderItem={(campaign) => {
                      const { id, name, isActive, signupCount, createdAt, accessType } = campaign;
                      
                      return (
                        <ResourceItem
                          id={id}
                          url={`/app/campaigns/${id}`}
                          accessibilityLabel={`View ${name}`}
                        >
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="semibold">
                                {name}
                              </Text>
                              <InlineStack gap="200">
                                <Badge status={isActive ? "success" : "critical"}>
                                  {isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge>
                                  {accessType.replace('_', ' ')}
                                </Badge>
                              </InlineStack>
                            </BlockStack>
                            <BlockStack gap="100" align="end">
                              <Text variant="bodyMd" fontWeight="semibold">
                                {signupCount} signups
                              </Text>
                              <Text variant="bodySm" color="subdued">
                                {new Date(createdAt).toLocaleDateString()}
                              </Text>
                            </BlockStack>
                          </InlineStack>
                        </ResourceItem>
                      );
                    }}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Quick Actions
                  </Text>
                  <List>
                    <List.Item>
                      <Link url="/app/campaigns/new" removeUnderline>
                        Create new campaign
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link url="/app/campaigns" removeUnderline>
                        Manage campaigns
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link url="/app/campaigns" removeUnderline>
                        View analytics
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Features
                  </Text>
                  <List>
                    <List.Item>Password-protected pages</List.Item>
                    <List.Item>Secret link access</List.Item>
                    <List.Item>Email signup collection</List.Item>
                    <List.Item>Klaviyo integration</List.Item>
                    <List.Item>Omnisend integration</List.Item>
                    <List.Item>Product & collection gating</List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
