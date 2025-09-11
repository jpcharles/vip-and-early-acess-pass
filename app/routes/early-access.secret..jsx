import { redirect } from "@remix-run/node";
import prisma from "../db.server";

export const loader = async ({ params }) => {
  const { secretLink } = params;

  // Find campaign by secret link
  const campaign = await prisma.earlyAccessCampaign.findFirst({
    where: { secretLink },
    include: {
      gatedPages: {
        where: { isActive: true },
        take: 1,
      },
    },
  });

  if (!campaign || !campaign.isActive) {
    throw new Response("Invalid or inactive secret link", { status: 404 });
  }

  // Check if campaign has expired
  if (campaign.expiresAt && new Date() > campaign.expiresAt) {
    throw new Response("Campaign has expired", { status: 403 });
  }

  // Redirect to the gated page with access granted
  if (campaign.gatedPages.length > 0) {
    return redirect(`/early-access/${campaign.gatedPages[0].slug}?access=granted`);
  }

  // If no gated page, redirect to campaign redirect URL or show error
  if (campaign.redirectUrl) {
    return redirect(campaign.redirectUrl);
  }

  throw new Response("No content available for this campaign", { status: 404 });
};
