import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type ExportTourParams = {
  placeName: string;
  generatedText: string;
  createdAt: string;
};

export type ExportFormat = 'txt' | 'json';

export type ExportResult = {
  success: boolean;
  filePath?: string;
  error?: string;
};

export const exportTour = async (
  params: ExportTourParams,
  format: ExportFormat = 'txt'
): Promise<ExportResult> => {
  try {
    // Проверка доступности sharing
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Sharing недоступен на этом устройстве',
      };
    }

    // Sanitize имени файла из placeName
    const sanitizedName = params.placeName
      .replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, '') // Удалить спецсимволы
      .replace(/\s+/g, '_') // Пробелы → подчеркивания
      .substring(0, 50); // Ограничить длину

    const fileName = `${sanitizedName}.${format}`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Форматирование содержимого
    let content: string;
    if (format === 'json') {
      content = JSON.stringify(
        {
          placeName: params.placeName,
          generatedText: params.generatedText,
          createdAt: params.createdAt,
          exportedAt: new Date().toISOString(),
          app: 'OhMyGuide',
        },
        null,
        2
      );
    } else {
      // Текстовый формат
      const dateStr = new Date(params.createdAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      content = `ЭКСКУРСИЯ: ${params.placeName}\n`;
      content += `Дата создания: ${dateStr}\n`;
      content += `\n${'='.repeat(50)}\n\n`;
      content += params.generatedText;
      content += `\n\n${'='.repeat(50)}\n`;
      content += `\nСоздано в приложении OhMyGuide`;
    }

    // Запись файла
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share Sheet
    await Sharing.shareAsync(fileUri, {
      mimeType: format === 'json' ? 'application/json' : 'text/plain',
      dialogTitle: `Экспорт: ${params.placeName}`,
      UTI: format === 'json' ? 'public.json' : 'public.plain-text',
    });

    // Удаление временного файла
    setTimeout(async () => {
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } catch {
        // Игнорируем ошибку удаления
      }
    }, 5000);

    return {
      success: true,
      filePath: fileUri,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка при экспорте',
    };
  }
};
