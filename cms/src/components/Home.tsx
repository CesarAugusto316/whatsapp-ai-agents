import Link from "next/link";
import logo from "../assets/nexoti_2.png";

export default function NavLink() {
  return (
    <Link
      href="/admin"
      style={{
        marginBottom: 24,
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <img
        style={{
          width: 100,
          height: "auto",
        }}
        src={logo.src}
        alt="Nexoti Logo"
      />
    </Link>
  );
}
