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
  Banner,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { EditIcon, ExternalIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { campaignId } = params;

  const campaign = await db.earlyAccessCampaign.findFirst({
    where: { 
      id: campaignId,
      shop: session.shop 
    },
    include: {
      signups: {
        orderBy: { createdAt: "desc" },
        take: 100
      }
    }
  });

  if (!campaign) {
    throw new Response("Campaign not found", { status: 404 });
  }

  // Generate the early access URL
  const baseUrl = new URL(request.url).origin;
  const earlyAccessUrl = `${baseUrl}/early-access/${campaign.secretKey}`;

  return json({ campaign, earlyAccessUrl });
};

export default function CampaignDetail() {
  const { campaign, earlyAccessUrl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const signupRows = campaign.signups.map((signup) => [
    signup.email,
    signup.firstName || "-",
    signup.lastName || "-",
    signup.phone || "-",
    signup.syncedToEmail ? 
      <Badge status="success">Synced</Badge> : 
      <Badge status="attention">Pending</Badge>,
    new Date(signup.createdAt).toLocaleDateString(),
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Page>
      <TitleBar 
        title={campaign.name}
        breadcrumbs={[{ content: "Campaigns", url: "/app" }]}
      />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <InlineStack align="space-between">
              <BlockStack gap="200">
                <Text variant="headingLg" as="h1">
                  {campaign.name}
                </Text>
                {campaign.description && (
                  <Text variant="bodyMd" color="subdued">
                    {campaign.description}
                  </Text>
                )}
              </BlockStack>
              <InlineStack gap="300">
                <Button
                  icon={EditIcon}
                  onClick={() => navigate(`/app/campaigns/${campaign.id}/edit`)}
                >
                  Edit Campaign
                </Button>
                <Button
                  primary
                  icon={ExternalIcon}
                  onClick={() => window.open(earlyAccessUrl, "_blank")}
                >
                  View Landing Page
                </Button>
              </InlineStack>
            </InlineStack>

            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Campaign Details
                  </Text>
                  
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text>Status:</Text>
                      {campaign.isActive ? (
                        <Badge status="success">Active</Badge>
                      ) : (
                        <Badge>Inactive</Badge>
                      )}
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text>Target Type:</Text>
                      <Text>{campaign.targetType === "product" ? "Product" : "Collection"}</Text>
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text>Total Signups:</Text>
                      <Text fontWeight="semibold">{campaign.signups.length}</Text>
                    </InlineStack>
                    
                    <InlineStack align="space-between">
                      <Text>Created:</Text>
                      <Text>{new Date(campaign.createdAt).toLocaleDateString()}</Text>
                    </InlineStack>

                    {campaign.emailProvider && (
                      <InlineStack align="space-between">
                        <Text>Email Provider:</Text>
                        <Text>{campaign.emailProvider}</Text>
                      </InlineStack>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Early Access URL
                  </Text>
                  
                  <Banner status="info">
                    <p>Share this secret URL with your VIP customers to give them early access.</p>
                  </Banner>

                  <InlineStack gap="300">
                    <div style={{ flexGrow: 1, fontFamily: "monospace", fontSize: "14px", padding: "8px", backgroundColor: "#f6f6f7", borderRadius: "4px" }}>
                      {earlyAccessUrl}
                    </div>
                    <Button onClick={() => copyToClipboard(earlyAccessUrl)}>
                      Copy
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Signups ({campaign.signups.length})
                </Text>
                
                {campaign.signups.length === 0 ? (
                  <Text color="subdued">No signups yet.</Text>
                ) : (
                  <DataTable
                    columnContentTypes={[
                      "email",
                      "text",
                      "text", 
                      "text",
                      "text",
                      "text"
                    ]}
                    headings={[
                      "Email",
                      "First Name",
                      "Last Name",
                      "Phone",
                      "Email Sync",
                      "Signup Date"
                    ]}
                    rows={signupRows}
                  />
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
