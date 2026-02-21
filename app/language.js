import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    StyleSheet, Text, TouchableOpacity, useColorScheme, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { setLanguage } from '../store/languageSlice';

const LANGUAGES = [
    { code: 'uk', label: 'Українська', flag: '🇺🇦', sub: 'Ukrainian' },
    { code: 'en', label: 'English', flag: '🇬🇧', sub: 'Англійська' },
];

export default function LanguageScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const scheme = useColorScheme();
    const theme = Colors[scheme ?? 'light'];
    const isDark = scheme === 'dark';
    const locale = useSelector(s => s.language?.locale ?? 'uk');
    const [selected, setSelected] = useState(locale);

    const handleSave = () => {
        dispatch(setLanguage(selected));
        router.back();
    };

    return (
        <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[s.title, { color: theme.text }]}>{t(locale, 'languageTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <Text style={[s.subtitle, { color: 'gray' }]}>{t(locale, 'languageSubtitle')}</Text>

            <View style={s.list}>
                {LANGUAGES.map(lang => {
                    const isSelected = selected === lang.code;
                    return (
                        <TouchableOpacity
                            key={lang.code}
                            style={[
                                s.langItem,
                                { backgroundColor: theme.card },
                                isSelected && s.langItemActive,
                            ]}
                            onPress={() => setSelected(lang.code)}
                            activeOpacity={0.8}
                        >
                            <Text style={s.flag}>{lang.flag}</Text>
                            <View style={s.langText}>
                                <Text style={[s.langLabel, { color: theme.text }]}>{lang.label}</Text>
                                <Text style={[s.langSub, { color: 'gray' }]}>{lang.sub}</Text>
                            </View>
                            <View style={[s.radio, isSelected && s.radioActive]}>
                                {isSelected && <View style={s.radioDot} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Text style={s.saveBtnText}>{t(locale, 'save')}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        borderRadius: 12,
    },
    title: { fontSize: 18, fontWeight: '800' },
    subtitle: { fontSize: 14, marginHorizontal: 20, marginBottom: 24 },

    list: { marginHorizontal: 16, gap: 12 },
    langItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderRadius: 16,
        borderWidth: 2, borderColor: 'transparent',
    },
    langItemActive: { borderColor: '#e334e3' },
    flag: { fontSize: 36, marginRight: 14 },
    langText: { flex: 1 },
    langLabel: { fontSize: 17, fontWeight: '700' },
    langSub: { fontSize: 13, marginTop: 2 },

    radio: {
        width: 24, height: 24, borderRadius: 12,
        borderWidth: 2, borderColor: 'gray',
        justifyContent: 'center', alignItems: 'center',
    },
    radioActive: { borderColor: '#e334e3' },
    radioDot: {
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: '#e334e3',
    },

    saveBtn: {
        margin: 20, marginTop: 'auto',
        backgroundColor: '#e334e3', height: 54, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#e334e3', shadowOpacity: 0.4, shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 }, elevation: 8,
    },
    saveBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
});
