import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ArcTrail database...");

  // --- ArtifactType registry ---
  const artifactTypes = [
    { name: "Concept", defaultRepresentation: "rich", color: "#5B4FD9" },
    { name: "Prototype", defaultRepresentation: "rich", color: "#7065E0" },
    { name: "Subsystem", defaultRepresentation: "medium", color: "#8A80E7" },
    { name: "Feature", defaultRepresentation: "medium", color: "#A69EED" },
    { name: "Variation", defaultRepresentation: "minimal", color: "#C4BFF4" },
    { name: "Component", defaultRepresentation: "minimal", color: "#DDD9F9" },
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
    { name: "idea", order: 0, color: "#4A6ED4" },
    { name: "research", order: 1, color: "#4D88C4" },
    { name: "experiment", order: 2, color: "#4A9EAA" },
    { name: "build", order: 3, color: "#4A9E80" },
    { name: "validate", order: 4, color: "#C8901A" },
    { name: "tune", order: 5, color: "#D88010" },
    { name: "deploy", order: 6, color: "#E8A020" },
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
      stageId: stageMap["build"].id,
      summary: "First prototype of the VisFrame concept — a standalone desktop unit.",
      categories: "[]",
      media: JSON.stringify([
        { type: "img", src: "/uploads/SonoForm_No1.png", alt: "Sonoform No.1" },
      ]),
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
      stageId: stageMap["build"].id,
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
      stageId: stageMap["build"].id,
      summary: "Stacked translucent acrylic diffusion panels for volumetric light distribution.",
      categories: "[]",
    },
  });

  // --- Components under Audio Input → RCA Input ---
  const rcaJack = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "COMPONENT",
      representation: "minimal",
      title: "RCA Jack Pair",
      artifactTypeId: typeMap["Component"].id,
      stageId: stageMap["build"].id,
      summary: "Gold-plated RCA female connectors for left/right channel input.",
      categories: "[]",
    },
  });

  const impedanceBuffer = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "COMPONENT",
      representation: "minimal",
      title: "Impedance Buffer",
      artifactTypeId: typeMap["Component"].id,
      stageId: stageMap["experiment"].id,
      summary: "Op-amp buffer stage for impedance matching between source and ADC.",
      categories: "[]",
    },
  });

  // --- Additional Feature under Audio Input: Subwoofer Output ---
  const subwooferOutput = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "FEATURE",
      representation: "medium",
      title: "Subwoofer Output",
      artifactTypeId: typeMap["Feature"].id,
      stageId: stageMap["experiment"].id,
      summary: "Low-frequency output channel driving a dedicated subwoofer transducer.",
      categories: "[]",
    },
  });

  const subwooferDriver = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "COMPONENT",
      representation: "minimal",
      title: "Subwoofer Driver",
      artifactTypeId: typeMap["Component"].id,
      stageId: stageMap["build"].id,
      summary: "8-inch long-throw woofer cone for deep bass reproduction.",
      categories: "[]",
    },
  });

  const passiveResonator = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "COMPONENT",
      representation: "minimal",
      title: "Passive Resonator",
      artifactTypeId: typeMap["Component"].id,
      stageId: stageMap["experiment"].id,
      summary: "Passive radiator membrane that extends low-end response without added power.",
      categories: "[]",
    },
  });

  const crossoverFilter = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "COMPONENT",
      representation: "minimal",
      title: "Crossover Filter",
      artifactTypeId: typeMap["Component"].id,
      stageId: stageMap["experiment"].id,
      summary: "Active low-pass filter at 120 Hz separating sub-bass from mid-range.",
      categories: "[]",
    },
  });

  // --- Components under Light Output → Layered Acrylic Panels ---
  const acrylicSheet = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "COMPONENT",
      representation: "minimal",
      title: "Acrylic Diffusion Sheet",
      artifactTypeId: typeMap["Component"].id,
      stageId: stageMap["build"].id,
      summary: "3mm frosted acrylic panel for even light diffusion across the output face.",
      categories: "[]",
    },
  });

  const ledMatrix = await prisma.artifact.create({
    data: {
      projectId: project.id,
      kind: "COMPONENT",
      representation: "minimal",
      title: "LED Matrix",
      artifactTypeId: typeMap["Component"].id,
      stageId: stageMap["build"].id,
      summary: "16×16 WS2812B addressable RGB LED grid behind the acrylic stack.",
      categories: "[]",
    },
  });

  console.log(`  ✓ 14 Artifacts`);

  // --- Relations (all PARENT_OF) ---
  const parentOfId = rtMap["PARENT_OF"].id;

  await prisma.relation.createMany({
    data: [
      { projectId: project.id, fromId: visFrame.id, toId: sonoform.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: sonoform.id, toId: audioInput.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: sonoform.id, toId: lightOutput.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: audioInput.id, toId: rcaInput.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: audioInput.id, toId: subwooferOutput.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: lightOutput.id, toId: layeredAcrylic.id, relationTypeId: parentOfId },
      // Components under RCA Input
      { projectId: project.id, fromId: rcaInput.id, toId: rcaJack.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: rcaInput.id, toId: impedanceBuffer.id, relationTypeId: parentOfId },
      // Components under Subwoofer Output
      { projectId: project.id, fromId: subwooferOutput.id, toId: subwooferDriver.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: subwooferOutput.id, toId: passiveResonator.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: subwooferOutput.id, toId: crossoverFilter.id, relationTypeId: parentOfId },
      // Components under Layered Acrylic Panels
      { projectId: project.id, fromId: layeredAcrylic.id, toId: acrylicSheet.id, relationTypeId: parentOfId },
      { projectId: project.id, fromId: layeredAcrylic.id, toId: ledMatrix.id, relationTypeId: parentOfId },
    ],
  });
  console.log(`  ✓ 13 Relations`);

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

  // Members: subsystems, features, and components
  await prisma.snapshotMember.createMany({
    data: [
      { snapshotId: snapshot.id, artifactId: audioInput.id },
      { snapshotId: snapshot.id, artifactId: lightOutput.id },
      { snapshotId: snapshot.id, artifactId: rcaInput.id },
      { snapshotId: snapshot.id, artifactId: layeredAcrylic.id },
      { snapshotId: snapshot.id, artifactId: subwooferOutput.id },
      { snapshotId: snapshot.id, artifactId: rcaJack.id },
      { snapshotId: snapshot.id, artifactId: impedanceBuffer.id },
      { snapshotId: snapshot.id, artifactId: subwooferDriver.id },
      { snapshotId: snapshot.id, artifactId: passiveResonator.id },
      { snapshotId: snapshot.id, artifactId: crossoverFilter.id },
      { snapshotId: snapshot.id, artifactId: acrylicSheet.id },
      { snapshotId: snapshot.id, artifactId: ledMatrix.id },
    ],
  });
  console.log(`  ✓ 1 Snapshot (12 members)`);

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
