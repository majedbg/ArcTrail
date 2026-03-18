import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ArcTrail database...");

  // --- ArtifactType registry ---
  const artifactTypes = [
    { name: "Concept", defaultRepresentation: "rich", color: "#7F77DD" },
    { name: "Prototype", defaultRepresentation: "rich", color: "#1D9E75" },
    { name: "Subsystem", defaultRepresentation: "medium", color: "#378ADD" },
    { name: "Feature", defaultRepresentation: "medium", color: "#BA7517" },
    { name: "Variation", defaultRepresentation: "minimal", color: "#888780" },
    { name: "Component", defaultRepresentation: "minimal", color: "#D4537E" },
    { name: "Person", defaultRepresentation: "medium", color: "#639922" },
    { name: "Location", defaultRepresentation: "medium", color: "#9B59B6" },
    { name: "Event", defaultRepresentation: "medium", color: "#D85A30" },
  ];

  for (const at of artifactTypes) {
    await prisma.artifactType.upsert({
      where: { name: at.name },
      update: at,
      create: at,
    });
  }
  console.log(`  ✓ ${artifactTypes.length} ArtifactTypes`);

  // --- Stage registry ---
  const stages = [
    { name: "idea", order: 0, color: "#7F77DD" },
    { name: "research", order: 1, color: "#378ADD" },
    { name: "experiment", order: 2, color: "#1D9E75" },
    { name: "prototype", order: 3, color: "#BA7517" },
    { name: "validate", order: 4, color: "#EF9F27" },
    { name: "tune", order: 5, color: "#D85A30" },
    { name: "deploy", order: 6, color: "#D4537E" },
  ];

  for (const s of stages) {
    await prisma.stage.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log(`  ✓ ${stages.length} Stages`);

  // --- RelationType registry ---
  const relationTypes = [
    { name: "ITERATES_ON", label: "Iterates on", color: "#3DDDF2", animated: true },
    { name: "FORKS_FROM", label: "Forks from", color: "#9B59B6", animated: true },
    { name: "USES_COMPONENT", label: "Uses", color: "#FFC876", animated: false },
    { name: "CONTRIBUTED_BY", label: "Contributed by", color: "#A8E6CF", animated: false },
    { name: "DISPLAYED_AT", label: "Displayed at", color: "#FF6DB4", animated: false },
    { name: "PARENT_OF", label: "Parent of", color: "#555555", animated: false },
  ];

  for (const rt of relationTypes) {
    await prisma.relationType.upsert({
      where: { name: rt.name },
      update: rt,
      create: rt,
    });
  }
  console.log(`  ✓ ${relationTypes.length} RelationTypes`);

  // --- Demo project: VisFrame ---
  const project = await prisma.project.upsert({
    where: { slug: "visframe" },
    update: {},
    create: {
      slug: "visframe",
      title: "VisFrame",
      summary: "An audio-reactive visual synthesizer exploring the intersection of sound and light.",
    },
  });
  console.log(`  ✓ Project: ${project.title}`);

  // Clean up existing demo data so seed is idempotent
  await prisma.relation.deleteMany({ where: { projectId: project.id } });
  await prisma.snapshotMember.deleteMany({
    where: { snapshot: { projectId: project.id } },
  });
  await prisma.snapshot.deleteMany({ where: { projectId: project.id } });
  await prisma.artifact.deleteMany({ where: { projectId: project.id } });

  // Fetch lookup records
  const typeMap = Object.fromEntries(
    (await prisma.artifactType.findMany()).map((t) => [t.name, t])
  );
  const stageMap = Object.fromEntries(
    (await prisma.stage.findMany()).map((s) => [s.name, s])
  );
  const rtMap = Object.fromEntries(
    (await prisma.relationType.findMany()).map((r) => [r.name, r])
  );

  // --- Artifacts ---
  const visFrame = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "CONCEPT",
      representation: "rich",
      title: "VisFrame",
      artifactTypeId: typeMap["Concept"].id,
      stageId: stageMap["idea"].id,
      summary: "A modular audio-visual synthesis platform designed to translate sound into light.",
      categories: "[]",
    },
  });

  const sonoform = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "PROTOTYPE",
      representation: "rich",
      title: "Sonoform No.1",
      artifactTypeId: typeMap["Prototype"].id,
      stageId: stageMap["prototype"].id,
      summary: "First prototype of the VisFrame concept — a standalone desktop unit.",
      categories: "[]",
    },
  });

  const audioInput = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "SUBSYSTEM",
      representation: "medium",
      title: "Audio Input",
      subsystemCode: "AI",
      artifactTypeId: typeMap["Subsystem"].id,
      stageId: stageMap["experiment"].id,
      summary: "Captures and pre-processes audio signals for the synthesis engine.",
      categories: "[]",
    },
  });

  const lightOutput = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "SUBSYSTEM",
      representation: "medium",
      title: "Light Output",
      subsystemCode: "LO",
      artifactTypeId: typeMap["Subsystem"].id,
      stageId: stageMap["experiment"].id,
      summary: "Drives the LED matrix and projection system based on synthesis output.",
      categories: "[]",
    },
  });

  const rcaInput = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "FEATURE",
      representation: "medium",
      title: "RCA Input",
      artifactTypeId: typeMap["Feature"].id,
      stageId: stageMap["prototype"].id,
      summary: "Dual RCA phono input with impedance matching for line-level audio sources.",
      categories: "[]",
    },
  });

  const layeredAcrylic = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "FEATURE",
      representation: "medium",
      title: "Layered Acrylic Panels",
      artifactTypeId: typeMap["Feature"].id,
      stageId: stageMap["prototype"].id,
      summary: "Stacked translucent acrylic diffusion panels for volumetric light distribution.",
      categories: "[]",
    },
  });

  console.log(`  ✓ 6 Artifacts`);

  // --- Relations (all PARENT_OF) ---
  const parentOfId = rtMap["PARENT_OF"].id;

  await prisma.relation.createMany({
    data: [
      { projectId: project.id, fromId: visFrame.id, toId: sonoform.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: sonoform.id, toId: audioInput.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: sonoform.id, toId: lightOutput.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: audioInput.id, toId: rcaInput.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: lightOutput.id, toId: layeredAcrylic.id, relationTypeId: parentOfId },
    ],
  });
  console.log(`  ✓ 5 Relations`);

  // --- Snapshot ---
  const snapshot = await prisma.snapshot.create({
    data: {
      projectId: project.id,
      prototypeArtifactId: sonoform.id,
      versionString: "AI.RCA1-LO.LAP1",
      displayLabel: "Initial build",
      dateISO: new Date().toISOString().split("T")[0],
      notes: "First tracked configuration of Sonoform No.1 — both subsystems active.",
    },
  });

  // Members: all four non-concept, non-prototype artifacts
  await prisma.snapshotMember.createMany({
    data: [
      { snapshotId: snapshot.id, artifactId: audioInput.id },
      { snapshotId: snapshot.id, artifactId: lightOutput.id },
      { snapshotId: snapshot.id, artifactId: rcaInput.id },
      { snapshotId: snapshot.id, artifactId: layeredAcrylic.id },
    ],
  });
  console.log(`  ✓ 1 Snapshot (4 members)`);

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
