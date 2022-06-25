import { writable } from "svelte/store";

export const discipline = writable("TRI");
export const disciplineToColor = (discipline) => {
  const table = {
    TRI: "pink",
    DMT: "blue",
    TUM: "purple",
  };
  return table[discipline];
};
