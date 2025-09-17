import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Badge,
  Button,
  Icon,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData } from "@remix-run/react";
import { loader } from "./app._index";

export default function CampaignsPage() {
  const { campaigns, pagination, filters } = useLoaderData<typeof loader>() ?? { campaigns: [], pagination: { totalCount: 0, totalPages: 1, page: 1 }, filters: {} };

  const rows = campaigns.map((campaign: any) => {
    return [
      <Box key="name">
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          {campaign.name}
        </Text>
        {campaign.description && (
          <Text as="p" variant="bodySm">
            {campaign.description}
          </Text>
        )}
      </Box>,
      <InlineStack key="status" gap="200" align="center">
        {/* <Badge status={campaign.isActive ? "success" : "critical"}>
          {campaign.isActive ? "Active" : "Inactive"}
        </Badge> */}
        {/* {campaign.isExpired && (
          <Badge status="warning">Expired</Badge>
        )} */}
      </InlineStack>,
      <Text key="signups" as="p" variant="bodyMd">
        {campaign.signupCount} signups
      </Text>,
      <Text key="created" as="p" variant="bodyMd">
        {new Date(campaign.createdAt).toLocaleDateString()}
      </Text>,
      // <InlineStack key="actions" gap="100">
      //   <Button
      //     size="slim"
      //     icon={ViewIcon}
      //     onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
      //   >
      //     View
      //   </Button>
      //   <Button
      //     size="slim"
      //     icon={EditIcon}
      //     onClick={() => {
      //       setEditingCampaign(campaign);
      //       setIsEditModalOpen(true);
      //     }}
      //   >
      //     Edit
      //   </Button>
      //   <Button
      //     size="slim"
      //     onClick={() => handleToggleCampaign(campaign)}
      //   >
      //     {campaign.isActive ? "Pause" : "Activate"}
      //   </Button>
      //   {campaign.accessType === "SECRET_LINK" && (
      //     <Button
      //       size="slim"
      //       icon={DuplicateIcon}
      //       onClick={async () => {
      //         try {
      //           await navigator.clipboard.writeText(campaign.secretLinkUrl);
      //           setToastMessage("Secret link copied to clipboard!");
      //         } catch (error) {
      //           console.error("Failed to copy to clipboard:", error);
      //           setToastMessage("Failed to copy link to clipboard");
      //         }
      //       }}
      //     >
      //       Copy Link
      //     </Button>
      //   )}
      //   <Button
      //     size="slim"
      //     icon={DeleteIcon}
      //     destructive
      //     onClick={() => handleDeleteCampaign(campaign)}
      //   >
      //     Delete
      //   </Button>
      // </InlineStack>,
    ];
  });

  return (
    <Page>
      <TitleBar title="Campaigns" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              {campaigns.length === 0 ? (
                <EmptyState
                  heading="No campaigns yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create early access campaigns to give VIP customers exclusive access to your products.</p>
                  <Box paddingBlockStart="400">
                    <Button variant="primary" url="/app/campaigns/new">
                      Create Campaign
                    </Button>
                  </Box>
                </EmptyState>
              ) : (
                <>
                  {/* <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="headingMd">Campaigns ({0})</Text>
                    <InlineStack gap="200">
                      <TextField
                        placeholder="Search campaigns..."
                        value={searchValue}
                        onChange={handleSearchChange}
                        prefix={<Icon source={SearchIcon} />}
                        clearButton
                      />
                    </InlineStack>
                  </InlineStack>

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
                  )} */}
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <Box
      as="span"
      padding="025"
      paddingInlineStart="100"
      paddingInlineEnd="100"
      background="bg-surface-active"
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
    >
      <code>{children}</code>
    </Box>
  );
}
