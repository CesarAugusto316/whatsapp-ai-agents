import logo from "../assets/nexoti_2.png";

export default function Logo() {
  return (
    <img
      style={{
        width: 200,
        height: "auto",
        display: "block",
      }}
      src={logo.src}
      alt="Nexoti Logo"
    />
  );
}
