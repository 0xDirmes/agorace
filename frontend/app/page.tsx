"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Keyboard, Zap, Wallet, Trophy, ChevronRight, Star } from "lucide-react";

import { AgoraLogo } from "@/components/competition/AgoraLogo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { CompetitionStatus } from "@/components/competition/CompetitionStatus";
import { Leaderboard } from "@/components/competition/Leaderboard";
import { usePlayerState } from "@/hooks/usePlayerState";

export default function Home() {
  const { isConnected } = useAccount();
  const { hasPlayed, bestScore } = usePlayerState();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 glass-card border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <AgoraLogo />

          <div className="flex items-center gap-4">
            {isConnected && (
              <div className="hidden md:block">
                <CompetitionStatus compact />
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-12 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Hero Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-4">
                  Type Fast.
                  <br />
                  <span className="gradient-text">Cash Out.</span>
                </h1>

                <p className="text-lg text-muted-foreground max-w-md">
                  Compete in weekly typing races. Pay 1 AUSD per attempt — no
                  gas needed. The fastest typist takes the entire prize pool.
                </p>
              </div>

              {/* Competition Status */}
              <CompetitionStatus />

              {/* CTA Section */}
              <div className="flex flex-wrap gap-4 items-center">
                {!isConnected && <ConnectButton />}

                {isConnected && (
                  <>
                    <Link href="/play">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-game-primary"
                      >
                        <Keyboard className="w-5 h-5 mr-2 inline" />
                        Start Typing
                      </motion.button>
                    </Link>

                    {hasPlayed && (
                      <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Best:
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            {bestScore.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Fee Notice */}
              {isConnected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      1 AUSD Per Attempt
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sign a one-time approval, then play as many times as you
                      want — no gas needed.
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Right: Leaderboard */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] overflow-auto leaderboard-scroll"
            >
              <Leaderboard maxEntries={isConnected ? undefined : 5} compact={!isConnected} />
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              How It Works
            </h2>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  icon: Wallet,
                  title: "Connect Wallet",
                  desc: "Use Porto passkey — no extension needed",
                },
                {
                  icon: Zap,
                  title: "Approve & Play",
                  desc: "One-time approval, then play unlimited — no gas",
                },
                {
                  icon: Keyboard,
                  title: "Type Fast",
                  desc: "Best score counts across all attempts",
                },
                {
                  icon: Trophy,
                  title: "Win Big",
                  desc: "Winner takes the entire pot",
                },
              ].map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-xl p-6 text-center relative group"
                >
                  {i < 3 && (
                    <ChevronRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground z-10" />
                  )}
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <AgoraLogo />
          <p className="text-sm text-muted-foreground">
            Built on Monad. All attempt fees go to the prize pool.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Discord
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
