import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle, LayoutDashboard, Home } from "lucide-react";
import { GlassNavbar } from "@/components/layout/GlassNavbar";
import { GlassFooter } from "@/components/layout/GlassFooter";
import { GlassButton } from "@/components/ui/glass-button";
import { motion } from "framer-motion";

const PaymentSuccess = () => {
    return (
        <div className="min-h-screen bg-neutral-900 overflow-hidden font-sans text-foreground selection:bg-primary/30 selection:text-primary-foreground">
            <GlassNavbar />

            <div className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-[80vh] flex items-center justify-center">
                {/* Background elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[url('/hero-bg-1.jpg')] bg-cover bg-center opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/80 via-neutral-900/90 to-neutral-900" />
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] animate-pulse-slow" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 w-full max-w-md"
                >
                    <div className="glass-card p-8 md:p-10 text-center backdrop-blur-xl border-glass-neutral/20 shadow-glass-lg rounded-2xl">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="mx-auto mb-6 bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center border border-green-500/20 shadow-glow-green"
                        >
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </motion.div>

                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-primary mb-3">
                            Payment Successful!
                        </h1>

                        <p className="text-white/70 mb-8 text-lg">
                            Thank you for your payment. Your order has been processed successfully.
                        </p>

                        <div className="space-y-4">
                            <Link to="/dashboard" className="block">
                                <GlassButton variant="default" className="w-full justify-center group" size="lg">
                                    <LayoutDashboard className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                                    Go to Dashboard
                                </GlassButton>
                            </Link>

                            <Link to="/" className="block">
                                <GlassButton variant="outline" className="w-full justify-center group" size="lg">
                                    <Home className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                                    Return Home
                                </GlassButton>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>

            <GlassFooter />
        </div>
    );
};

export default PaymentSuccess;
