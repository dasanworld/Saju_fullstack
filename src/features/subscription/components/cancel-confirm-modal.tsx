"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCancelSubscription } from "../hooks/useCancelSubscription";
import { useSubscription } from "../hooks/useSubscription";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface CancelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CancelConfirmModal({ isOpen, onClose }: CancelConfirmModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const { data: subscription } = useSubscription();
  const cancelSubscription = useCancelSubscription();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelSubscription.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });

      toast({
        title: "구독 취소가 예약되었습니다",
        description: "다음 결제일까지 서비스를 계속 이용하실 수 있습니다.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "구독 취소에 실패했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const nextBillingDate = subscription?.next_billing_date
    ? format(parseISO(subscription.next_billing_date), "yyyy년 MM월 dd일")
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>구독을 취소하시겠습니까?</DialogTitle>
          <DialogDescription>
            다음 사항을 확인해주세요.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription className="space-y-2">
            <p>• 다음 결제일({nextBillingDate})까지 서비스를 계속 이용하실 수 있습니다.</p>
            <p>• 결제일 이전에는 언제든지 취소를 철회할 수 있습니다.</p>
            <p>• 환불은 불가합니다.</p>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCancelling}>
            돌아가기
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "처리 중..." : "취소하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
