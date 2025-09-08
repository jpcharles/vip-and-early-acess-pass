import { useState, useEffect } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useFetcher, useParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  TextField,
  FormLayout,
  Banner,
  BlockStack,
  InlineStack,
  Spinner,
  Divider,
  Box,
  Link,
  Badge,
  Modal,
  Toast,
  Frame,
  DisplayText,
  Subheading,
  Caption,
  Icon,
  Tooltip,
  Thumbnail,
  ResourceList,
  ResourceItem,
  Avatar,
  Stack,
  ButtonGroup,
  CalloutCard,
  EmptyState,
} from "@shopify/polaris";
import { PrismaClient } from "@prisma/client";
import { syncSignupToEmailPlatforms } from "../services/emailSync";
import { LockIcon, ViewIcon, StarIcon, EmailIcon, KeyIcon, LinkIcon } from "@shopify/polaris-icons";

const prisma = new PrismaClient();

export const loader = async ({ request, params }) => {
  const url = new URL(request.url);
  const secretLink = params["*"];
  
  try {
    const campaign = await prisma.earlyAccessCampaign.findFirst({
      where: {
        secretLink: {
          contains: secretLink
        },
        isActive: true,
      },
      include: {
        signups: true,
      },
    });

    if (!campaign) {
      return json({ 
        campaign: null, 
        error: "Campaign not found or inactive" 
      });
    }

    await prisma.earlyAccessCampaign.update({
      where: { id: campaign.id },
      data: { totalViews: campaign.totalViews + 1 },
    });

    return json({ campaign });
  } catch (error) {
    console.error('Error loading campaign:', error);
    return json({ 
      campaign: null, 
      error: "Failed to load campaign" 
    });
  }
};

export const action = async ({ request, params }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const secretLink = params["*"];

  try {
    const campaign = await prisma.earlyAccessCampaign.findFirst({
      where: {
        secretLink: {
          contains: secretLink
        },
        isActive: true,
      },
    });

    if (!campaign) {
      return json({ 
        success: false, 
        error: "Campaign not found" 
      });
    }

    switch (action) {
      case "verify_password": {
        const password = formData.get("password");
        
        if (campaign.password === password) {
          return json({ 
            success: true, 
            message: "Access granted!" 
          });
        } else {
          return json({ 
            success: false, 
            error: "Invalid password" 
          });
        }
      }

      case "signup": {
        const email = formData.get("email");
        const firstName = formData.get("firstName");
        const lastName = formData.get("lastName");

        const existingSignup = await prisma.signup.findFirst({
          where: {
            email,
            campaignId: campaign.id,
          },
        });

        if (existingSignup) {
          return json({ 
            success: false, 
            error: "Email already registered for this campaign" 
          });
        }

        const signup = await prisma.signup.create({
          data: {
            email,
            firstName: firstName || null,
            lastName: lastName || null,
            campaignId: campaign.id,
          },
          include: {
            campaign: true,
          },
        });

        await prisma.earlyAccessCampaign.update({
          where: { id: campaign.id },
          data: { totalSignups: campaign.totalSignups + 1 },
        });

        // Sync to email platforms
        try {
          const credentials = {
            klaviyoApiKey: process.env.KLAVIYO_API_KEY,
            omnisendApiKey: process.env.OMNISEND_API_KEY,
          };

          const syncResults = await syncSignupToEmailPlatforms(signup, campaign, credentials);
          
          // Update signup with sync status
          await prisma.signup.update({
            where: { id: signup.id },
            data: {
              klaviyoSynced: syncResults.klaviyo?.success || false,
              omnisendSynced: syncResults.omnisend?.success || false,
              klaviyoContactId: syncResults.klaviyo?.contactId || null,
              omnisendContactId: syncResults.omnisend?.contactId || null,
            },
          });
        } catch (syncError) {
          console.error('Email sync error:', syncError);
        }

        return json({ 
          success: true, 
          message: "Successfully signed up for early access!" 
        });
      }

      default:
        return json({ 
          success: false, 
          error: "Invalid action" 
        });
    }
  } catch (error) {
    console.error('Error in action:', error);
    return json({ 
      success: false, 
      error: "Something went wrong. Please try again." 
    });
  }
};

export default function EarlyAccessPage() {
  const { campaign, error } = useLoaderData();
  const actionData = useActionData();
  const fetcher = useFetcher();
  const params = useParams();
  
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (actionData?.success) {
      if (actionData.message?.includes("Access granted")) {
        setIsAuthenticated(true);
        if (campaign?.accessType === "EMAIL_SIGNUP") {
          setShowSignupForm(true);
        }
      } else if (actionData.message?.includes("signed up")) {
        setShowSignupForm(false);
        setToastActive(true);
        setToastMessage(actionData.message);
      }
    } else if (actionData?.error) {
      setToastActive(true);
      setToastMessage(actionData.error);
    }
  }, [actionData, campaign]);

  const handlePasswordSubmit = () => {
    const formData = new FormData();
    formData.append("action", "verify_password");
    formData.append("password", password);
    fetcher.submit(formData, { method: "post" });
  };

  const handleSignupSubmit = () => {
    const formData = new FormData();
    formData.append("action", "signup");
    formData.append("email", email);
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    fetcher.submit(formData, { method: "post" });
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
      case "SECRET_LINK": return "Secret Link Access";
      case "EMAIL_SIGNUP": return "Email Signup Required";
      case "PASSWORD_OR_EMAIL": return "Password or Email Signup";
      default: return type;
    }
  };

  if (error || !campaign) {
    return (
      <Frame>
        <Page title="Early Access">
          <Layout>
            <Layout.Section>
              <Card>
                <EmptyState
                  heading="Campaign Not Found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>The early access campaign you're looking for doesn't exist or is no longer active.</p>
                </EmptyState>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
    />
  ) : null;

  return (
    <Frame>
      <Page title={`${campaign.name} - Early Access`}>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Box>
                    <DisplayText size="large" as="h1">
                      {campaign.name}
                    </DisplayText>
                    {campaign.description && (
                      <Text variant="bodyLg" as="p" color="subdued">
                        {campaign.description}
                      </Text>
                    )}
                  </Box>
                  <Badge status="success" icon={getAccessTypeIcon(campaign.accessType)}>
                    {getAccessTypeLabel(campaign.accessType)}
                  </Badge>
                </InlineStack>
                
                <Divider />
                
                <InlineStack gap="400">
                  <Box>
                    <Text variant="bodyMd" fontWeight="bold" as="p">
                      {campaign.totalSignups}
                    </Text>
                    <Caption>VIP Members</Caption>
                  </Box>
                  <Box>
                    <Text variant="bodyMd" fontWeight="bold" as="p">
                      {campaign.totalViews}
                    </Text>
                    <Caption>Total Views</Caption>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>

            {!isAuthenticated && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Get Early Access
                  </Text>
                  
                  {campaign.accessType === "PASSWORD" && (
                    <FormLayout>
                      <TextField
                        label="Enter Password"
                        value={password}
                        onChange={setPassword}
                        type="password"
                        placeholder="Enter the VIP password"
                        autoComplete="off"
                      />
                      <Button
                        primary
                        onClick={handlePasswordSubmit}
                        loading={fetcher.state === "submitting"}
                        disabled={!password.trim()}
                      >
                        Access VIP Content
                      </Button>
                    </FormLayout>
                  )}

                  {campaign.accessType === "EMAIL_SIGNUP" && (
                    <FormLayout>
                      <TextField
                        label="Email Address"
                        value={email}
                        onChange={setEmail}
                        type="email"
                        placeholder="Enter your email address"
                        autoComplete="email"
                      />
                      <TextField
                        label="First Name (Optional)"
                        value={firstName}
                        onChange={setFirstName}
                        placeholder="Enter your first name"
                        autoComplete="given-name"
                      />
                      <TextField
                        label="Last Name (Optional)"
                        value={lastName}
                        onChange={setLastName}
                        placeholder="Enter your last name"
                        autoComplete="family-name"
                      />
                      <Button
                        primary
                        onClick={handleSignupSubmit}
                        loading={fetcher.state === "submitting"}
                        disabled={!email.trim()}
                      >
                        Join VIP List
                      </Button>
                    </FormLayout>
                  )}

                  {campaign.accessType === "PASSWORD_OR_EMAIL" && (
                    <BlockStack gap="300">
                      <ButtonGroup>
                        <Button
                          onClick={() => setShowSignupForm(false)}
                          pressed={!showSignupForm}
                        >
                          Use Password
                        </Button>
                        <Button
                          onClick={() => setShowSignupForm(true)}
                          pressed={showSignupForm}
                        >
                          Sign Up
                        </Button>
                      </ButtonGroup>

                      {!showSignupForm ? (
                        <FormLayout>
                          <TextField
                            label="Enter Password"
                            value={password}
                            onChange={setPassword}
                            type="password"
                            placeholder="Enter the VIP password"
                            autoComplete="off"
                          />
                          <Button
                            primary
                            onClick={handlePasswordSubmit}
                            loading={fetcher.state === "submitting"}
                            disabled={!password.trim()}
                          >
                            Access VIP Content
                          </Button>
                        </FormLayout>
                      ) : (
                        <FormLayout>
                          <TextField
                            label="Email Address"
                            value={email}
                            onChange={setEmail}
                            type="email"
                            placeholder="Enter your email address"
                            autoComplete="email"
                          />
                          <TextField
                            label="First Name (Optional)"
                            value={firstName}
                            onChange={setFirstName}
                            placeholder="Enter your first name"
                            autoComplete="given-name"
                          />
                          <TextField
                            label="Last Name (Optional)"
                            value={lastName}
                            onChange={setLastName}
                            placeholder="Enter your last name"
                            autoComplete="family-name"
                          />
                          <Button
                            primary
                            onClick={handleSignupSubmit}
                            loading={fetcher.state === "submitting"}
                            disabled={!email.trim()}
                          >
                            Join VIP List
                          </Button>
                        </FormLayout>
                      )}
                    </BlockStack>
                  )}

                  {campaign.accessType === "SECRET_LINK" && (
                    <CalloutCard
                      title="Welcome to VIP Early Access!"
                      illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      primaryAction={{
                        content: "View Exclusive Products",
                        url: "#products",
                      }}
                    >
                      <p>You have exclusive access to our latest products before they're available to the public!</p>
                    </CalloutCard>
                  )}
                </BlockStack>
              </Card>
            )}

            {isAuthenticated && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    í¾‰ Welcome to VIP Early Access!
                  </Text>
                  
                  <Banner status="success">
                    You now have exclusive access to our latest products and collections.
                  </Banner>

                  <Text variant="bodyLg" as="p">
                    Thank you for being a VIP member! You can now browse and purchase our exclusive early access products.
                  </Text>

                  <EmptyState
                    heading="Products Coming Soon"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Product integration will be added to display the selected products and collections.</p>
                  </EmptyState>
                </BlockStack>
              </Card>
            )}
          </Layout.Section>
        </Layout>

        {toastMarkup}
      </Page>
    </Frame>
  );
}
