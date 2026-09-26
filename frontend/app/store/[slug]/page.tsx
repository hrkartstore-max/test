"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";

type Product = {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  stock?: number;
  image?: string;
  status?: string;
};

declare global {
  interface Window {
    Cashfree?: any;
  }
}

type Store = {
  id: string;
  name: string;
  slug: string;
  category?: string;
  theme?: string;
  published?: boolean;
};

const API = "/api/public/stores";

export default function Storefront() {
  const params = useParams<{ slug: string }>();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [order, setOrder] = useState<any>(null);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    async function loadStore() {
      try {
        const r = await fetch(`${API}/${encodeURIComponent(params.slug)}`, {
          cache: "no-store",
        });
        const d = await r.json();

        if (!r.ok) {
          throw new Error(d.message || "Store not found");
        }

        setStore(d.store || d);
        setProducts(Array.isArray(d.products) ? d.products : []);
      } catch (e: any) {
        setError(e.message || "Unable to load store");
      } finally {
        setLoading(false);
      }
    }

    loadStore();
  }, [params.slug]);

  const total = useMemo(
    () => cart.reduce((sum, product) => sum + Number(product.price || 0), 0),
    [cart]
  );

  function add(product: Product) {
    setCart((current) => [...current, product]);
  }

  async function payOnline(e: React.FormEvent) {
    e.preventDefault();

    if (!cart.length) return;

    if (!customer.email) {
      setError("Email is required for online payment.");
      return;
    }

    setOrdering(true);
    setError("");

    try {
      const counts = new Map<string, number>();

      cart.forEach((product) => {
        const id = String(product.id || product._id);
        counts.set(id, (counts.get(id) || 0) + 1);
      });

      const r = await fetch(
        `${API}/${encodeURIComponent(params.slug)}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer,
            items: [...counts].map(([productId, quantity]) => ({
              productId,
              quantity,
            })),
          }),
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.message || "Unable to start payment");
      }

      if (!window.Cashfree) {
        throw new Error("Cashfree checkout is loading. Please try again.");
      }

      const cashfree = window.Cashfree({
        mode:
          process.env.NEXT_PUBLIC_CASHFREE_MODE === "production"
            ? "production"
            : "sandbox",
      });

      await cashfree.checkout({
        paymentSessionId: d.paymentSessionId,
        redirectTarget: "_self",
      });
    } catch (e: any) {
      setError(e.message || "Unable to start payment");
    } finally {
      setOrdering(false);
    }
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();

    if (!cart.length) return;

    setOrdering(true);
    setError("");

    try {
      const counts = new Map<string, number>();

      cart.forEach((product) => {
        const id = String(product.id || product._id);
        counts.set(id, (counts.get(id) || 0) + 1);
      });

      const r = await fetch(
        `${API}/${encodeURIComponent(params.slug)}/orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer,
            items: [...counts].map(([productId, quantity]) => ({
              productId,
              quantity,
            })),
          }),
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.message || "Unable to place order");
      }

      setOrder(d);
      setCart([]);
      setCheckout(false);
    } catch (e: any) {
      setError(e.message || "Unable to place order");
    } finally {
      setOrdering(false);
    }
  }

  if (loading) {
    return (
      <>
        <Script
          src="https://sdk.cashfree.com/js/v3/cashfree.js"
          strategy="afterInteractive"
        />
        <main className="public-store">
          <div className="store-loading">Loading store…</div>
        </main>
      </>
    );
  }

  if (error || !store) {
    return (
      <main className="public-store">
        <div className="store-error">
          <h1>Store unavailable</h1>
          <p>{error || "This store could not be found."}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="afterInteractive"
      />

      <main className="public-store">
        <header className="store-header">
          <a href="/" className="store-brand">
            HEPRA
          </a>

          <div>
            <b>{store.name}</b>
            <span>{store.category || "Online Store"}</span>
          </div>

          <button
            className="cart-button"
            onClick={() =>
              document
                .getElementById("cart")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Cart ({cart.length})
          </button>
        </header>

        <section className="store-hero">
          <span>ONLINE STORE</span>
          <h1>{store.name}</h1>
          <p>
            Shop directly from our store. Simple, fast and mobile-friendly.
          </p>
        </section>

        <section className="store-products">
          <div className="store-section-head">
            <div>
              <small>CATALOG</small>
              <h2>Featured products</h2>
            </div>
            <span>{products.length} products</span>
          </div>

          {products.length === 0 ? (
            <div className="store-empty">No products available yet.</div>
          ) : (
            <div className="store-grid">
              {products.map((product) => (
                <article
                  className="store-card"
                  key={product.id || product._id}
                >
                  <div className="store-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <span>HEPRA</span>
                    )}
                  </div>

                  <div className="store-card-body">
                    <h3>{product.name}</h3>
                    <strong>
                      ₹{Number(product.price || 0).toLocaleString("en-IN")}
                    </strong>
                    <button
                      disabled={product.stock === 0}
                      onClick={() => add(product)}
                    >
                      {product.stock === 0 ? "Out of stock" : "Add to cart"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="cart" className="store-cart">
          <div>
            <small>YOUR CART</small>
            <h2>Cart</h2>
          </div>

          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((product, index) => (
                  <div key={index}>
                    <span>{product.name}</span>
                    <b>
                      ₹{Number(product.price || 0).toLocaleString("en-IN")}
                    </b>
                  </div>
                ))}
              </div>

              <div className="cart-total">
                <span>Total</span>
                <strong>₹{total.toLocaleString("en-IN")}</strong>
              </div>

              <button
                className="checkout-button"
                onClick={() => setCheckout(true)}
              >
                Continue to checkout
              </button>

              {checkout && (
                <form className="checkout-form" onSubmit={placeOrder}>
                  <h3>Customer details</h3>

                  <input
                    required
                    placeholder="Full name"
                    value={customer.name}
                    onChange={(e) =>
                      setCustomer({ ...customer, name: e.target.value })
                    }
                  />

                  <input
                    required
                    placeholder="Phone number"
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer({ ...customer, phone: e.target.value })
                    }
                  />

                  <input
                    type="email"
                    placeholder="Email for online payment (optional for COD)"
                    value={customer.email}
                    onChange={(e) =>
                      setCustomer({ ...customer, email: e.target.value })
                    }
                  />

                  <textarea
                    required
                    placeholder="Delivery address"
                    value={customer.address}
                    onChange={(e) =>
                      setCustomer({ ...customer, address: e.target.value })
                    }
                  />

                  <div>
                    <b>Payment method</b>

                    <div className="payment-choice">
                      <button
                        type="submit"
                        disabled={ordering}
                        onClick={() => setError("")}
                      >
                        COD
                      </button>

                      <button
                        type="button"
                        disabled={ordering}
                        onClick={payOnline}
                      >
                        UPI / Card
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="checkout-button"
                      disabled={ordering}
                    >
                      {ordering ? "Processing…" : "Place COD order"}
                    </button>
                  </div>
                </form>
              )}

              {order && (
                <div className="order-success">
                  <h3>Order placed 🎉</h3>
                  <p>
                    Order <b>{order.orderNumber}</b> confirmed.
                  </p>
                  <strong>
                    ₹{Number(order.total).toLocaleString("en-IN")}
                  </strong>
                </div>
              )}
            </>
          )}
        </section>

        <footer className="store-footer">
          <a href={"/track-order?store=" + encodeURIComponent(store.slug)}>
            Track Order
          </a>
          <span>
            Powered by <b>HEPRA</b>
          </span>
        </footer>
      </main>
    </>
  );
}
