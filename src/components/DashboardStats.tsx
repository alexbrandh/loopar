'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Postales</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.ready} listas para AR
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.thisWeek}</div>
          <p className="text-xs text-muted-foreground">
            Nuevas postales creadas
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successRate}%</div>
          <p className="text-xs text-muted-foreground">
            Postales procesadas exitosamente
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estado</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="text-xs">
              {stats.ready} Listas
            </Badge>
            {stats.processing > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.processing} Procesando
              </Badge>
            )}
            {stats.errors > 0 && (
              <Badge variant="destructive" className="text-xs">
                {stats.errors} Errores
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Distribución por estado
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

DashboardStats.displayName = 'DashboardStats';

export { DashboardStats };