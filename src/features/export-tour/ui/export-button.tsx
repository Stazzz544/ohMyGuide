import { JSX, useEffect } from 'react';
import { Alert } from 'react-native';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { Button } from '@app/shared/ui';
import { exportModel } from '../model/export-model';

import type { ExportTourParams, ExportFormat } from '../model/types';

type ExportButtonProps = {
  tourParams: ExportTourParams;
  format?: ExportFormat;
  label?: string;
  variant?: 'fill' | 'outline' | 'ghost';
  style?: object;
};

export const ExportButton = ({
  tourParams,
  format = 'txt',
  label = 'Экспорт',
  variant = 'outline',
  style,
}: ExportButtonProps): JSX.Element => {
  const { colors } = useTheme();
  const { isExporting, lastResult, onExport, dismissResult } = useUnit({
    isExporting: exportModel.$isExporting,
    lastResult: exportModel.$lastExportResult,
    onExport: exportModel.exportPressed,
    dismissResult: exportModel.exportResultDismissed,
  });

  useEffect(() => {
    if (lastResult) {
      if (lastResult.success) {
        Alert.alert('Успех', 'Экскурсия экспортирована', [
          { text: 'OK', onPress: dismissResult },
        ]);
      } else {
        Alert.alert('Ошибка', lastResult.error ?? 'Не удалось экспортировать', [
          { text: 'OK', onPress: dismissResult },
        ]);
      }
    }
  }, [lastResult, dismissResult]);

  return (
    <Button
      label={label}
      variant={variant}
      onPress={() => onExport({ tourParams, format })}
      disabled={isExporting}
      loading={isExporting}
      icon={<Ionicons name="download-outline" size={18} color={colors.primary} />}
      style={style}
    />
  );
};
