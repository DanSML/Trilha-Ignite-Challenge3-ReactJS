import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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

  function handleFindProduct(props:Product[], productId: number){
    return props.find(product => product.id === productId);
  } 

  async function lookUpOnStock(productId: number){
    const {data} = await api.get(`stock/${productId}`);
    return data;
  }

  async function getProduct(productId: number){
    const {data} = await api.get(`products/${productId}`);
    return data;
  }

  function getCartFromLocalStorage(){
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    } else {
      return [];
    }
  }

  const [cart, setCart] = useState<Product[]>(getCartFromLocalStorage());

  const addProduct = async (productId: number) => {

    try {
 
      const updatedCart = [...cart];

      const isProduct  = handleFindProduct(updatedCart, productId);

      const productStock = await lookUpOnStock(productId);

      const stockAmount = productStock.amount;

      const currentAmount = isProduct ? isProduct.amount : 0;

      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (isProduct){
        isProduct.amount = amount;
      } else {

        const product = await getProduct(productId);

        const newProduct = {
          ...product,
          amount:1,
        }
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };
 
  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productToDelete = handleFindProduct(updatedCart, productId);

      if (!productToDelete){

        toast.error("Erro na remoção do produto");
        return;

      } else {

        const updatedCartList = updatedCart.filter(product => product.id !== productId);

        setCart(updatedCartList);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCartList));
        
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
      const updatedCart = [...cart];
      
      const productStock = await lookUpOnStock(productId);

      if (amount <= 0){

        return;

      } else {
        if (amount > productStock.amount) {

          toast.error("Quantidade solicitada fora de estoque");
          return;

        } else {

          const updatedProduct = updatedCart.map((productStocky) => {
            if (productStocky.id === productId) {
              return {
                ...productStocky,
                amount:amount
              }
            }
            return productStocky;
          })

          setCart(updatedProduct);

          localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedProduct));
        }
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
