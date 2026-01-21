"use client"

import React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore, APP_CONFIGS, type AppId } from "@/stores/app-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AppSwitcherProps {
  collapsed?: boolean
}

export function AppSwitcher({ collapsed }: AppSwitcherProps) {
  const { activeApp, setActiveApp, getActiveConfig } = useAppStore()
  const activeConfig = getActiveConfig()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 hover:bg-secondary/50 rounded-md transition-colors cursor-pointer",
            collapsed ? "p-1.5 justify-center" : "py-1.5 px-2"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {!collapsed ? (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
              >
                {activeApp === 'audienceos' ? (
                  <>
                    <span className="text-[17px] font-semibold tracking-tight text-foreground dark:text-white">
                      audience
                    </span>
                    <span
                      className="text-[17px] font-light tracking-tight"
                      style={{
                        background: activeConfig.gradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      OS
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[17px] font-semibold tracking-tight text-foreground dark:text-white">
                      rev
                    </span>
                    <span
                      className="text-[17px] font-light tracking-tight"
                      style={{
                        background: activeConfig.gradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      OS
                    </span>
                  </>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
              </motion.div>
            ) : (
              <motion.span
                key="short-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[15px] font-semibold"
                style={{
                  background: activeConfig.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {activeConfig.shortName}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[220px]"
      >
        {(Object.keys(APP_CONFIGS) as AppId[]).map((appId) => {
          const config = APP_CONFIGS[appId]
          const isActive = activeApp === appId

          return (
            <DropdownMenuItem
              key={appId}
              onClick={() => setActiveApp(appId)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-primary/5"
              )}
            >
              <span
                className="text-lg"
                role="img"
                aria-label={config.name}
              >
                {config.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="font-medium"
                    style={{
                      background: config.gradient,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {config.name}
                  </span>
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {config.description}
                </p>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
