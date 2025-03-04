"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-slate-300 mt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 mt-4">
          {/* Mobile order: Confirm first, then Cancel */}
          <div className="flex flex-col sm:hidden w-full gap-2">
            <Button 
              variant="destructive" 
              onClick={onConfirm}
              disabled={isLoading}
              className="h-11"
            >
              {isLoading ? (
                <div className="flex items-center justify-center w-full">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                  Processing...
                </div>
              ) : (
                confirmLabel
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="h-11"
            >
              {cancelLabel}
            </Button>
          </div>
          
          {/* Desktop order: Cancel first, then Confirm */}
          <div className="hidden sm:flex sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="sm:flex-none h-10"
            >
              {cancelLabel}
            </Button>
            <Button 
              variant="destructive" 
              onClick={onConfirm}
              disabled={isLoading}
              className="sm:flex-none h-10"
            >
              {isLoading ? (
                <div className="flex items-center justify-center w-full">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                  Processing...
                </div>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
