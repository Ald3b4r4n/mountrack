import { render, screen } from "@testing-library/react";
import SuportePage from "@/app/suporte/page";
import { USER_SUPPORT_CONTACT } from "@/modules/support-contact";

describe("/suporte page", () => {
  // T036a — WhatsApp link renders with correct href
  it("renders a WhatsApp link with the correct href", () => {
    render(<SuportePage />);
    const link = screen.getByRole("link", { name: /whatsapp/i });
    expect(link).toHaveAttribute("href", USER_SUPPORT_CONTACT.whatsappHref);
  });

  // T036b — email link renders with mailto: href
  it("renders an email link with the correct mailto: href", () => {
    render(<SuportePage />);
    const link = screen.getByRole("link", { name: /email/i });
    expect(link).toHaveAttribute("href", `mailto:${USER_SUPPORT_CONTACT.email}`);
  });

  // T036c — phone link renders with tel: href
  it("renders a phone link with the correct tel: href", () => {
    render(<SuportePage />);
    const link = screen.getByRole("link", { name: /telefone|ligar/i });
    expect(link).toHaveAttribute("href", USER_SUPPORT_CONTACT.phoneHref);
  });

  // T036d — website link renders
  it("renders a website link", () => {
    render(<SuportePage />);
    const link = screen.getByRole("link", { name: new RegExp(USER_SUPPORT_CONTACT.websiteLabel) });
    expect(link).toHaveAttribute("href", USER_SUPPORT_CONTACT.websiteHref);
  });
});
