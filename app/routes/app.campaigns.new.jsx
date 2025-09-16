import { useState } from "react";
import { useLoaderData, useActionData, useNavigate, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  TextField,
  Select,
  Banner,
  FormLayout,
  ButtonGroup,
  Box,
  BlockStack,
} from '@shopify/polaris';
import {
  ArrowLeftIcon,
  SaveIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json, redirect } from "@remix-run/node";
import prisma from "../db.server";
import { CampaignUtils } from "../lib/campaign-utils";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { message: "Minimal route working" };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const name = formData.get("name");
  const description = formData.get("description");
  const accessType = formData.get("accessType");

  // Validate required fields
  if (!name || !accessType) {
    return json({ error: "Name and access type are required" }, { status: 400 });
  }

  try {
    const campaign = await prisma.earlyAccessCampaign.create({
      data: {
        shop: session.shop,
        name,
        description,
        accessType,
        productIds: [],
        collectionIds: [],
        autoTagEnabled: true,
        tagName: "VIP Early Access",
        isActive: true,
      },
    });

    return redirect(`/app/campaigns/${campaign.id}`);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return json({ error: "Failed to create campaign" }, { status: 500 });
  }
};

export default function NewCampaign() {
  const actionData = useActionData();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    accessType: "PASSWORD",
  });

  const accessTypeOptions = [
    { label: "Password Protected", value: "PASSWORD" },
    { label: "Secret Link", value: "SECRET_LINK" },
    { label: "Email Signup", value: "EMAIL_SIGNUP" },
    { label: "Password or Signup", value: "PASSWORD_OR_SIGNUP" },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

      <Form method="post">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Campaign Details</Text>
                
                <FormLayout>
                  <TextField
                    label="Campaign Name"
                    name="name"
                    value={formData.name}
                    onChange={(value) => handleInputChange("name", value)}
                    placeholder="e.g., VIP Early Access - New Collection"
                    required
                  />

                  <TextField
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={(value) => handleInputChange("description", value)}
                    placeholder="Describe your early access campaign"
                    multiline={3}
                  />

                  <Select
                    label="Access Type"
                    name="accessType"
                    options={accessTypeOptions}
                    value={formData.accessType}
                    onChange={(value) => handleInputChange("accessType", value)}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Save Button */}
        <Box padding="400">
          <Button
            primary
            size="large"
            icon={SaveIcon}
            submit
          >
            Create Campaign
          </Button>
        </Box>
      </Form>
    </Page>
  );
}