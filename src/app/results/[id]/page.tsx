import { SharedExperience } from "../../../components/experience";

export default async function SharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SharedExperience id={id} />;
}
