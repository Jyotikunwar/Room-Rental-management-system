// Backend/prisma/seed-faq.ts
// Run with: npx ts-node prisma/seed-faq.ts
// (or add "prisma": { "seed": "ts-node prisma/seed-faq.ts" } to package.json
// and run `npx prisma db seed`)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FAQS = [
  {
    question: "How do I find a room or flat on Horizon?",
    answer:
      "Use the search bar or Browse Rooms page to filter by city, budget, and room type. You can save listings you like and message the landlord directly.",
    order: 1,
  },
  {
    question: "Is there a fee to browse or contact landlords?",
    answer:
      "Browsing and messaging landlords is free for tenants. You only pay the rent and deposit set by the landlord once you book a room.",
    order: 2,
  },
  {
    question: "How do I list my property as a landlord?",
    answer:
      'Click "Post Property" or "List my Property", create an account, and fill in your room details, photos, and pricing. Your listing goes live once submitted.',
    order: 3,
  },
  {
    question: "How do payments work?",
    answer:
      "Tenants can pay rent through the platform using eSewa, Khalti, bank transfer, or cash, depending on what the landlord accepts. Payment history is tracked in your dashboard.",
    order: 4,
  },
  {
    question: "What if I have an issue with my room or landlord?",
    answer:
      "You can raise a complaint directly from your tenant dashboard. Our support team reviews and follows up on all reported issues.",
    order: 5,
  },
];

async function main() {
  for (const faq of FAQS) {
    await prisma.faq.create({ data: faq });
  }
  console.log(`Seeded ${FAQS.length} FAQs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });