import "dotenv/config";
import prisma from "../src/lib/prisma";

// SAFE - read only. Lists every FAQ row so you can see exact duplicates.
async function main() {
  const faqs = await (prisma as any).faq.findMany({ orderBy: { id: "asc" } });

  console.log(`Total FAQs: ${faqs.length}\n`);
  faqs.forEach((f: any) => {
    console.log(`#${f.id} | "${f.question}"`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });