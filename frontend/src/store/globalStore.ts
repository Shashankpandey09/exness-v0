import { create } from "zustand";
type store={
    token:string|null,
  
}
export const store=create<store>((set)=>({
     token:null,
     
}))