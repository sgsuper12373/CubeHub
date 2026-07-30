"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = ["All", "Algorithms", "Tutorials", "Methods"];

export function FilterBar() {
  const [activeTab, setActiveTab] = useState("All");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 z-20 relative">
      {/* Left: Segmented Control */}
      <div className="flex items-center p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner backdrop-blur-md self-stretch md:self-auto overflow-x-auto w-full md:w-auto hide-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap outline-none ${
                isActive ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl bg-learn-teal/20 border border-learn-teal/30 shadow-[0_0_20px_rgba(0,229,196,0.15)]"
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Search & Filters */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div 
          className={`relative flex items-center transition-all duration-300 ease-out flex-1 md:flex-none ${
            isSearchFocused ? "md:w-80" : "md:w-64"
          }`}
        >
          <Search className={`absolute left-3 w-4 h-4 transition-colors ${
            isSearchFocused ? "text-learn-teal" : "text-muted-foreground"
          }`} />
          <input
            type="text"
            placeholder="Search tutorials or algorithms..."
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-learn-teal/50 focus:border-learn-teal/50 transition-all shadow-inner"
          />
        </div>

        <Button 
          variant="outline" 
          className="h-11 rounded-xl bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:text-white transition-all shadow-sm"
        >
          <ListFilter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>
    </div>
  );
}
