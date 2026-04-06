import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
	name: string;
	avatarUrl: string | null;
	size?: "sm" | "default" | "lg";
};

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return (parts[0]?.[0] ?? "").toUpperCase();
	return (
		(parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
	).toUpperCase();
}

function ParticipantAvatar({ name, avatarUrl, size = "default" }: Props) {
	return (
		<Avatar size={size}>
			{avatarUrl && <AvatarImage alt={name} src={avatarUrl} />}
			<AvatarFallback>{getInitials(name)}</AvatarFallback>
		</Avatar>
	);
}

export { ParticipantAvatar };
