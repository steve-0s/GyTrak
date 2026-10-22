import AdministrationPages from "../../../features/administration/AdministrationPages";
type Props = { onAction: (message: string) => void };
export default function StaffScreen({ onAction }: Props) { return <AdministrationPages onAction={onAction} initialView="accounts" />; }
