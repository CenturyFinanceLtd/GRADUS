import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockResponse;

vi.mock("../../services/bannerService", () => ({
  listBanners: vi.fn(() => mockResponse),
}));

// Simplify the slick carousel for tests
vi.mock("react-slick", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid='mock-slider'>{children}</div>,
}));

import BannerOne from "../BannerOne";
import { createMatchMedia } from "../../setupTests";

const setViewport = (isMobile) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: createMatchMedia(isMobile),
  });
};

const renderBanner = () =>
  render(
    <MemoryRouter>
      <BannerOne />
    </MemoryRouter>
  );

describe("BannerOne", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockResponse = undefined;
  });

  it("shows the loading skeleton while banners are fetching", async () => {
    setViewport(false);
    let resolveFetch;
    mockResponse = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    renderBanner();

    expect(screen.getAllByText(/Loading banner/i).length).toBeGreaterThan(0);

    resolveFetch([]);
  });

  it("renders desktop slider when viewport is not mobile", async () => {
    setViewport(false);
    mockResponse = Promise.resolve([
      {
        id: "desktop-1",
        title: "Desktop Banner",
        desktopImageUrl: "/desktop.jpg",
        mobileImageUrl: "/mobile.jpg",
      },
    ]);

    const { container } = renderBanner();

    await waitFor(() =>
      expect(screen.getByAltText("Desktop Banner")).toBeInTheDocument()
    );
    expect(
      container.querySelector('[data-variant="desktop-banner"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-variant="mobile-banner"]')
    ).not.toBeInTheDocument();
  });

  it("renders mobile slider when viewport is mobile", async () => {
    setViewport(true);
    mockResponse = Promise.resolve([
      {
        id: "mobile-1",
        title: "Mobile Banner",
        desktopImageUrl: "/desktop.jpg",
        mobileImageUrl: "/mobile.jpg",
      },
    ]);

    const { container } = renderBanner();

    await waitFor(() =>
      expect(screen.getByAltText("Mobile Banner")).toBeInTheDocument()
    );
    expect(
      container.querySelector('[data-variant="mobile-banner"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-variant="desktop-banner"]')
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when no banners are available", async () => {
    setViewport(false);
    mockResponse = Promise.resolve([]);

    renderBanner();

    await waitFor(() =>
      expect(screen.getByText(/No banners available/i)).toBeInTheDocument()
    );
  });
});
