import { Link } from "@payloadcms/ui";

export default function MyCustomNav() {
  return (
    <nav>
      <ul>
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>
      </ul>
    </nav>
  );
}
