'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, TrendingUp, Layers } from 'lucide-react';
import type { Postcard } from '@/types/database';

interface DashboardStatsProps {
  postcards: Postcard[];
}

const DashboardStats = memo(({ postcards }: DashboardStatsProps) => {
  const stats = React.useMemo(() => {
    const total = postcards.length;
    const ready = postcards.filter(p => p.processing_status === 'ready').length;
    const processing = postcards.filter(p => p.processing_status === 'processing').length;
    const errors = postcards.filter(p => p.processing_status === 'error' || p.processing_status === 'needs_better_image').length;
    
    // Calculate this week's postcards
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeek = postcards.filter(p => new Date(p.created_at) >= oneWeekAgo).length;
    
    // Calculate success rate
    const successRate = total > 0 ? Math.round((ready / total) * 100) : 0;
    
    return {
      total,
      ready,
      processing,
      errors,
      thisWeek,
      successRate
    };
  }, [postcards]);

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 md:mb-8">
      {/* Total Postales */}
      <Card className="relative overflow-hidden border-border bg-linear-to-br from-card to-primary/10 hover:shadow-md transition-shadow">
        <CardContent className="p-2 sm:p-3 md:p-4">
          <div className="flex flex-col items-center text-center gap-1 sm:gap-2">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-primary/20">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Postales</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Esta Semana */}
      <Card className="relative overflow-hidden border-border bg-linear-to-br from-card to-ring/10 hover:shadow-md transition-shadow">
        <CardContent className="p-2 sm:p-3 md:p-4">
          <div className="flex flex-col items-center text-center gap-1 sm:gap-2">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-ring/20">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-ring" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.thisWeek}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Semana</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Tasa de Éxito */}
      <Card className="relative overflow-hidden border-border bg-linear-to-br from-card to-chart-5/10 hover:shadow-md transition-shadow">
        <CardContent className="p-2 sm:p-3 md:p-4">
          <div className="flex flex-col items-center text-center gap-1 sm:gap-2">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-chart-5/20">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-chart-5" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.successRate}%</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Éxito</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Estado */}
      <Card className="relative overflow-hidden border-border bg-linear-to-br from-card to-chart-3/10 hover:shadow-md transition-shadow">
        <CardContent className="p-2 sm:p-3 md:p-4">
          <div className="flex flex-col items-center text-center gap-1 sm:gap-2">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-chart-3/20">
              <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-chart-3" />
            </div>
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-2 py-0.5">
              {stats.ready} Listas
            </Badge>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Estado</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

DashboardStats.displayName = 'DashboardStats';

export { DashboardStats };