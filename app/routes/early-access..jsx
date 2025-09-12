import { useState, useEffect } from "react";
import { useLoaderData, useActionData, useFetcher, useNavigate } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
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
  Banner,
  Box,
  Divider,
  Badge,
  Modal,
  Form
} from '@shopify/polaris';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  ExternalIcon,
  CalendarIcon,
  PersonIcon
} from "@shopify/polaris-icons";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { json, redirect } from "@remix-run/node";
import prisma from "../db.server";
import { CampaignUtils } from "../lib/campaign-utils";
import { EmailMarketingService } from "../lib/email-marketing";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request, params }) => {
  const { slug } = params;
  const url = new URL(request.url);

  // Find the gated page by slug
  const gatedPage = await prisma.gatedPage.findUnique({
    where: { slug },
    include: {
      campaign: {
        include: {
          signups: true,
        },
      },
    },
  });

  if (!gatedPage || !gatedPage.isActive) {
    throw new Response("Page not found", { status: 404 });
  }

  // Check if campaign is active and not expired
  const campaign = gatedPage.campaign;
  if (!campaign.isActive) {
    throw new Response("Campaign is not active", { status: 403 });
  }

  if (campaign.expiresAt && new Date() > campaign.expiresAt) {
    throw new Response("Campaign has expired", { status: 403 });
  }

  // Check access based on access type
  const accessType = campaign.accessType;
  const hasAccess = url.searchParams.get("access") === "granted";
  const secretLink = url.searchParams.get("secret");
  const password = url.searchParams.get("password");

  let accessGranted = false;
  let accessReason = "";

  if (hasAccess) {
    accessGranted = true;
  } else {
    switch (accessType) {
      case "SECRET_LINK":
        accessGranted = secretLink === campaign.secretLink;
        accessReason = accessGranted ? "" : "Invalid secret link";
        break;
      case "PASSWORD":
        if (password) {
          accessGranted = await CampaignUtils.verifyPassword(password, campaign.password);
          accessReason = accessGranted ? "" : "Invalid password";
        } else {
          accessReason = "Password required";
        }
        break;
      case "EMAIL_SIGNUP":
        accessGranted = false; // Always require signup
        accessReason = "Email signup required";
        break;
      case "PASSWORD_OR_SIGNUP":
        if (password) {
          accessGranted = await CampaignUtils.verifyPassword(password, campaign.password);
          accessReason = accessGranted ? "" : "Invalid password";
        } else {
          accessGranted = false; // Require either password or signup
          accessReason = "Password or email signup required";
        }
        break;
    }
  }

  return json({
    gatedPage,
    campaign,
    accessGranted,
    accessReason,
    accessType,
    signupCount: campaign.signups.length,
  });
};

export const action = async ({ request, params }) => {
  const { slug } = params;
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    switch (action) {
      case "signup": {
        const email = formData.get("email");
        const firstName = formData.get("firstName");
        const lastName = formData.get("lastName");
        const phone = formData.get("phone");

        // Validate email
        if (!CampaignUtils.isValidEmail(email)) {
          return json({ success: false, error: "Invalid email address" }, { status: 400 });
        }

        // Find the campaign
        const gatedPage = await prisma.gatedPage.findUnique({
          where: { slug },
          include: { campaign: true },
        });

        if (!gatedPage) {
          return json({ success: false, error: "Campaign not found" }, { status: 404 });
        }

        // Check if email already exists
        const existingSignup = await prisma.earlyAccessSignup.findUnique({
          where: {
            campaignId_email: {
              campaignId: gatedPage.campaign.id,
              email: email,
            },
          },
        });

        if (existingSignup) {
          return json({ success: false, error: "Email already registered for this campaign" }, { status: 400 });
        }

        // Create signup
        const signup = await prisma.earlyAccessSignup.create({
          data: {
            campaignId: gatedPage.campaign.id,
            email,
            firstName,
            lastName,
            phone,
          },
        });

        // Sync to email marketing platforms
        const emailMarketing = new EmailMarketingService(
          process.env.KLAVIYO_API_KEY,
          process.env.OMNISEND_API_KEY
        );

        const syncResults = await emailMarketing.syncSignup(gatedPage.campaign, signup);

        // Update signup with sync status
        await prisma.earlyAccessSignup.update({
          where: { id: signup.id },
          data: {
            klaviyoSynced: syncResults.klaviyo.success,
            omnisendSynced: syncResults.omnisend.success,
            syncError: syncResults.klaviyo.error || syncResults.omnisend.error,
            lastSyncAttempt: new Date(),
          },
        });

        return json({ success: true, signup });
      }

      case "verify_password": {
        const password = formData.get("password");
        const gatedPage = await prisma.gatedPage.findUnique({
          where: { slug },
          include: { campaign: true },
        });

        if (!gatedPage) {
          return json({ success: false, error: "Campaign not found" }, { status: 404 });
        }

        const isValid = await CampaignUtils.verifyPassword(password, gatedPage.campaign.password);
        
        if (isValid) {
          return redirect(`/early-access/${slug}?access=granted`);
        } else {
          return json({ success: false, error: "Invalid password" }, { status: 400 });
        }
      }

      default:
        return json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function GatedPage() {
  const { gatedPage, campaign, accessGranted, accessReason, accessType, signupCount } = useLoaderData();
  const actionData = useActionData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  const isLoading = fetcher.state === "loading" || fetcher.state === "submitting";

  // Handle form changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle password verification
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!formData.password) {
      setErrors({ password: "Password is required" });
      return;
    }
    fetcher.submit(
      { action: "verify_password", password: formData.password },
      { method: "post" }
    );
  };

  // Handle email signup
  const handleSignupSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!CampaignUtils.isValidEmail(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    fetcher.submit(
      { action: "signup", ...formData },
      { method: "post" }
    );
  };

  // Show success message after signup
  useEffect(() => {
    if (actionData?.success && actionData?.signup) {
      setIsSignupModalOpen(false);
      setFormData({ email: "", firstName: "", lastName: "", phone: "", password: "" });
      // Redirect to granted access
      navigate(`/early-access/${gatedPage.slug}?access=granted`);
    }
  }, [actionData, gatedPage.slug, navigate]);

  // Render access form based on access type
  const renderAccessForm = () => {
    switch (accessType) {
      case "PASSWORD":
        return (
          <Card>
            <Form onSubmit={handlePasswordSubmit}>
              <FormLayout>
                <Text variant="headingMd" as="h2">
                  Enter Password
                </Text>
                <Text variant="bodyMd" color="subdued">
                  {campaign.customMessage || "This content is password protected. Please enter the password to continue."}
                </Text>
                <TextField
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(value) => handleInputChange("password", value)}
                  error={errors.password || actionData?.error}
                  required
                />
                <Button submit primary loading={isLoading}>
                  Access Content
                </Button>
              </FormLayout>
            </Form>
          </Card>
        );

      case "SECRET_LINK":
        return (
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Invalid Access
              </Text>
              <Text variant="bodyMd" color="subdued">
                This content requires a secret link to access. Please use the correct link provided to you.
              </Text>
              <Banner status="critical">
                <p>Invalid or missing secret link</p>
              </Banner>
            </BlockStack>
          </Card>
        );

      case "EMAIL_SIGNUP":
        return (
          <Card>
            <Form onSubmit={handleSignupSubmit}>
              <FormLayout>
                <Text variant="headingMd" as="h2">
                  Join Early Access
                </Text>
                <Text variant="bodyMd" color="subdued">
                  {campaign.customMessage || "Sign up to get early access to this exclusive content."}
                </Text>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(value) => handleInputChange("email", value)}
                  error={errors.email || actionData?.error}
                  required
                />
                <TextField
                  label="First Name"
                  value={formData.firstName}
                  onChange={(value) => handleInputChange("firstName", value)}
                />
                <TextField
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(value) => handleInputChange("lastName", value)}
                />
                <TextField
                  label="Phone (Optional)"
                  value={formData.phone}
                  onChange={(value) => handleInputChange("phone", value)}
                />
                <Button submit primary loading={isLoading}>
                  Get Early Access
                </Button>
              </FormLayout>
            </Form>
          </Card>
        );

      case "PASSWORD_OR_SIGNUP":
        return (
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Access Required
              </Text>
              <Text variant="bodyMd" color="subdued">
                {campaign.customMessage || "Enter the password or sign up to access this content."}
              </Text>
              <InlineStack gap="300">
                <Button
                  primary
                  onClick={() => setIsSignupModalOpen(true)}
                >
                  Sign Up
                </Button>
                <Button
                  onClick={() => {
                    // Show password form
                    const passwordForm = document.getElementById("password-form");
                    if (passwordForm) {
                      passwordForm.style.display = "block";
                    }
                  }}
                >
                  Enter Password
                </Button>
              </InlineStack>
              <div id="password-form" style={{ display: "none" }}>
                <Form onSubmit={handlePasswordSubmit}>
                  <FormLayout>
                    <TextField
                      label="Password"
                      type="password"
                      value={formData.password}
                      onChange={(value) => handleInputChange("password", value)}
                      error={errors.password || actionData?.error}
                      required
                    />
                    <Button submit primary loading={isLoading}>
                      Access Content
                    </Button>
                  </FormLayout>
                </Form>
              </div>
            </BlockStack>
          </Card>
        );

      default:
        return (
          <Card>
            <Banner status="critical">
              <p>Invalid access configuration</p>
            </Banner>
          </Card>
        );
    }
  };

  // Render the actual content when access is granted
  const renderContent = () => {
    return (
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingLg" as="h1">
                  {gatedPage.title}
                </Text>
                <Badge status="success">
                  <InlineStack gap="100" align="center">
                    <CheckCircleIcon />
                    <Text variant="bodyMd">Early Access</Text>
                  </InlineStack>
                </Badge>
              </InlineStack>
              
              {gatedPage.metaDescription && (
                <Text variant="bodyMd" color="subdued">
                  {gatedPage.metaDescription}
                </Text>
              )}

              <Divider />

              <div dangerouslySetInnerHTML={{ __html: gatedPage.content }} />

              {campaign.redirectUrl && (
                <Box paddingBlockStart="400">
                  <Button
                    primary
                    size="large"
                    url={campaign.redirectUrl}
                    external
                    icon={ExternalIcon}
                  >
                    Continue to Store
                  </Button>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">
                Campaign Info
              </Text>
              <InlineStack gap="200" align="center">
                <PersonIcon />
                <Text variant="bodyMd">{signupCount} people have joined</Text>
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
    );
  };

  return (
    <AppProvider isEmbeddedApp={false}>
      <Page>
        <Layout>
          <Layout.Section>
            {accessGranted ? renderContent() : renderAccessForm()}
          </Layout.Section>
        </Layout>

        {/* Signup Modal for PASSWORD_OR_SIGNUP */}
        <Modal
          open={isSignupModalOpen}
          onClose={() => setIsSignupModalOpen(false)}
          title="Join Early Access"
          primaryAction={{
            content: "Sign Up",
            onAction: () => {
              const form = document.getElementById("signup-form");
              if (form) {
                form.requestSubmit();
              }
            },
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setIsSignupModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Form id="signup-form" onSubmit={handleSignupSubmit}>
              <FormLayout>
                <Text variant="bodyMd" color="subdued">
                  {campaign.customMessage || "Sign up to get early access to this exclusive content."}
                </Text>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(value) => handleInputChange("email", value)}
                  error={errors.email || actionData?.error}
                  required
                />
                <TextField
                  label="First Name"
                  value={formData.firstName}
                  onChange={(value) => handleInputChange("firstName", value)}
                />
                <TextField
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(value) => handleInputChange("lastName", value)}
                />
                <TextField
                  label="Phone (Optional)"
                  value={formData.phone}
                  onChange={(value) => handleInputChange("phone", value)}
                />
              </FormLayout>
            </Form>
          </Modal.Section>
        </Modal>
      </Page>
    </AppProvider>
  );
}
