"use client"
import SignUpForm from "@/components/SignUpForm";
import { AuthProvider } from "@/context/AuthProvider";
import Image from "next/image";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => { window.location.href = '/signup' }, [])

  return (
    <div />
  );
}
