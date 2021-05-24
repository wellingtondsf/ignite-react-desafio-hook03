import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(cartPreviousValue !== cart){
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(cart)
      );
    }
  },[cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const existingProduct = cart.find((product) => product.id === productId);

      if (existingProduct) {
        updateProductAmount({
          productId: existingProduct.id,
          amount: existingProduct.amount + 1,
        });
        return;
      }

      const isProductAmountOutOfStock =
        (await api
          .get(`/stock/${productId}`)
          .then((response) => response.data.amount)) <= 0;

      if (isProductAmountOutOfStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newProduct = await api
        .get(`/products/${productId}`)
        .then((response) => response.data);

      const newStoragedCart = [...cart, { ...newProduct, amount: 1 }];
      
      setCart(newStoragedCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newStoragedCart = [...cart];
      const productDeletedIndex = newStoragedCart.findIndex(
        (product) => product.id === productId
      );
      if (productDeletedIndex >= 0) {
        newStoragedCart.splice(productDeletedIndex, 1);

        setCart(newStoragedCart);
      } else {
        toast.error("Erro na remoção do produto");
        return;
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      } else {
        const isProductAmountOutOfStock =
          (await api
            .get(`/stock/${productId}`)
            .then((response) => response.data.amount)) < amount;

        if (isProductAmountOutOfStock) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const newStoragedCart = [...cart];

        const productModifiedIndex = newStoragedCart.findIndex(
          (product) => product.id === productId
        );
        const productModified = newStoragedCart[productModifiedIndex];
        productModified.amount = amount;

        setCart(newStoragedCart);
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
