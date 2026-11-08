import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", ...rest }) => {
  return (
    <View
      className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm shadow-slate-200/50 mb-3 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
};
