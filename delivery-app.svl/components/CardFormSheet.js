import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    useColorScheme,
} from 'react-native';
import Colors from '../constants/Colors';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.72;
const ITEM_H = 40;
const VISIBLE = 5;

const UA_MONTHS = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];
const now = new Date();
const CUR_YEAR = now.getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => String(CUR_YEAR + i));

// ─── Drum ────────────────────────────────────────────────────────────────────
function Drum({ items, selectedIndex, onSelect, width }) {
    const ref = useRef(null);
    const isDark = useColorScheme() === 'dark';
    const bg = isDark ? '#1c1c1e' : '#f0f0f5';

    const scrollTo = (idx) =>
        ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });

    return (
        <View style={[d.wrap, { width, backgroundColor: bg }]}>
            {/* selector line */}
            <View style={d.selectorTop} pointerEvents="none" />
            <View style={d.selectorBot} pointerEvents="none" />
            {/* top fade */}
            <View style={[d.fade, d.fadeTop, { backgroundColor: bg + 'ee' }]} pointerEvents="none" />
            {/* bottom fade */}
            <View style={[d.fade, d.fadeBot, { backgroundColor: bg + 'ee' }]} pointerEvents="none" />

            <ScrollView
                ref={ref}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_H}
                decelerationRate="fast"
                contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
                onLayout={() => scrollTo(selectedIndex)}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.max(0, Math.min(
                        Math.round(e.nativeEvent.contentOffset.y / ITEM_H),
                        items.length - 1
                    ));
                    onSelect(idx);
                }}
            >
                {items.map((item, i) => {
                    const dist = Math.abs(i - selectedIndex);
                    return (
                        <TouchableOpacity
                            key={item}
                            style={d.item}
                            onPress={() => { onSelect(i); scrollTo(i); }}
                            activeOpacity={0.6}
                        >
                            <Text style={[
                                d.text,
                                { color: isDark ? '#fff' : '#000' },
                                dist === 0 && d.textActive,
                                dist === 1 && d.textNear,
                                dist >= 2 && d.textFar,
                            ]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const d = StyleSheet.create({
    wrap: { height: ITEM_H * VISIBLE, borderRadius: 14, overflow: 'hidden' },
    selectorTop: {
        position: 'absolute', top: ITEM_H * 2, left: 12, right: 12,
        height: 1, backgroundColor: '#e334e3', zIndex: 3,
    },
    selectorBot: {
        position: 'absolute', top: ITEM_H * 3 - 1, left: 12, right: 12,
        height: 1, backgroundColor: '#e334e3', zIndex: 3,
    },
    fade: {
        position: 'absolute', left: 0, right: 0, height: ITEM_H * 1.4, zIndex: 2,
    },
    fadeTop: { top: 0 },
    fadeBot: { bottom: 0 },
    item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 15, fontWeight: '400' },
    textActive: { fontSize: 17, fontWeight: '700', color: '#e334e3' },
    textNear: { opacity: 0.5 },
    textFar: { opacity: 0.2 },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCard(raw) {
    return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function brand(n) {
    const d = n.replace(/\s/g, '');
    if (/^4/.test(d)) return 'VISA';
    if (/^5[1-5]/.test(d)) return 'MC';
    return '';
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CardFormSheet({ onClose, onSave }) {
    const scheme = useColorScheme();
    const theme = Colors[scheme ?? 'light'];
    const isDark = scheme === 'dark';

    const [num, setNum] = useState('');
    const [mo, setMo] = useState(now.getMonth());
    const [yr, setYr] = useState(0);
    const [cvv, setCvv] = useState('');
    const [focus, setFocus] = useState(null);
    const shake = useRef(new Animated.Value(0)).current;
    const cvvRef = useRef(null);

    const digits = num.replace(/\s/g, '');
    const cardBrand = brand(num);
    const valid = digits.length === 16 && cvv.length >= 3;

    const doShake = () =>
        Animated.sequence([
            Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 5, duration: 55, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start();

    const handleSave = () => {
        if (!valid) { doShake(); return; }
        onSave?.({ number: `•••• ${digits.slice(-4)}`, expiry: `${String(mo + 1).padStart(2, '0')}/${YEARS[yr].slice(-2)}` });
        onClose();
    };

    const previewNum = Array.from({ length: 4 }, (_, g) =>
        (digits.slice(g * 4, g * 4 + 4) || '').padEnd(4, '•')
    ).join('  ');

    return (
        <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
                <View style={s.backdrop} />
            </TouchableWithoutFeedback>

            <View style={[s.sheet, { backgroundColor: isDark ? '#141414' : '#f8f8f8', height: SHEET_H }]}>
                <View style={s.pill} />

                {/* Close */}
                <TouchableOpacity style={[s.closeBtn, { backgroundColor: theme.card }]} onPress={onClose}>
                    <Ionicons name="close" size={16} color={theme.text} />
                </TouchableOpacity>

                <Text style={[s.title, { color: theme.text }]}>Нова картка</Text>

                {/* ── Card preview ── */}
                <Animated.View style={[s.card, { transform: [{ translateX: shake }] }]}>
                    <View style={s.cardGlow1} />
                    <View style={s.cardGlow2} />
                    {/* chip */}
                    <View style={s.chip}><View style={s.chipInner} /></View>
                    {/* brand */}
                    {cardBrand ? (
                        <Text style={s.cardBrand}>{cardBrand}</Text>
                    ) : (
                        <Ionicons name="card-outline" size={18} color="rgba(255,255,255,0.35)" style={s.cardBrand} />
                    )}
                    {/* number */}
                    <Text style={s.cardNum}>{previewNum}</Text>
                    {/* bottom */}
                    <View style={s.cardFoot}>
                        <View>
                            <Text style={s.cardLbl}>ТЕРМІН</Text>
                            <Text style={s.cardVal}>{String(mo + 1).padStart(2, '0')}/{YEARS[yr].slice(-2)}</Text>
                        </View>
                        <View>
                            <Text style={s.cardLbl}>CVV</Text>
                            <Text style={s.cardVal}>{'•'.repeat(cvv.length || 3)}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* ── Number field ── */}
                <View style={[s.field, { backgroundColor: theme.card }, focus === 'n' && s.fieldFocused]}>
                    <Ionicons name="card-outline" size={18} color={cardBrand ? '#e334e3' : 'gray'} />
                    <TextInput
                        style={[s.fieldInput, { color: theme.text }]}
                        placeholder="Номер картки"
                        placeholderTextColor="gray"
                        keyboardType="number-pad"
                        value={num}
                        onChangeText={v => {
                            const f = formatCard(v);
                            setNum(f);
                            if (f.replace(/\s/g, '').length === 16) Keyboard.dismiss();
                        }}
                        maxLength={19}
                        onFocus={() => setFocus('n')}
                        onBlur={() => setFocus(null)}
                    />
                    {digits.length === 16 && <Ionicons name="checkmark-circle" size={18} color="#27ae60" />}
                </View>

                {/* ── Date + CVV row ── */}
                <View style={s.row}>
                    {/* Drums */}
                    <View style={s.drumWrap}>
                        <Text style={[s.lbl, { color: 'gray' }]}>Місяць / Рік</Text>
                        <View style={[s.drumsBox, { backgroundColor: theme.card }]}>
                            <Drum items={UA_MONTHS} selectedIndex={mo} onSelect={setMo} width={SCREEN_W * 0.26} />
                            <Text style={{ color: '#e334e3', fontSize: 18, fontWeight: '200' }}>/</Text>
                            <Drum items={YEARS} selectedIndex={yr} onSelect={setYr} width={SCREEN_W * 0.16} />
                        </View>
                    </View>

                    {/* CVV */}
                    <View style={s.cvvWrap}>
                        <Text style={[s.lbl, { color: 'gray' }]}>CVV</Text>
                        <View style={[s.field, s.cvvField, { backgroundColor: theme.card }, focus === 'cvv' && s.fieldFocused]}>
                            <TextInput
                                ref={cvvRef}
                                style={[s.cvvInput, { color: theme.text }]}
                                placeholder="•••"
                                placeholderTextColor="gray"
                                keyboardType="number-pad"
                                secureTextEntry
                                value={cvv}
                                onChangeText={v => {
                                    const cl = v.replace(/\D/g, '').slice(0, 4);
                                    setCvv(cl);
                                    if (cl.length >= 3) Keyboard.dismiss();
                                }}
                                onFocus={() => setFocus('cvv')}
                                onBlur={() => setFocus(null)}
                                maxLength={4}
                            />
                            <Ionicons name="lock-closed" size={14} color={focus === 'cvv' ? '#e334e3' : 'gray'} />
                        </View>
                    </View>
                </View>

                {/* ── Save ── */}
                <TouchableOpacity
                    style={[s.saveBtn, !valid && { opacity: 0.45 }]}
                    onPress={handleSave}
                    activeOpacity={0.85}
                >
                    <Ionicons name="lock-closed" size={16} color="white" style={{ marginRight: 8 }} />
                    <Text style={s.saveTxt}>Зберегти картку</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    backdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20, paddingBottom: 32,
    },
    pill: {
        width: 38, height: 4, borderRadius: 2, backgroundColor: '#555',
        alignSelf: 'center', marginTop: 10, marginBottom: 16,
    },
    closeBtn: {
        position: 'absolute', top: 18, right: 18,
        width: 30, height: 30, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center',
    },
    title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2, marginBottom: 14 },

    // Card
    card: {
        height: 138, borderRadius: 20,
        backgroundColor: '#15052a',
        padding: 16, marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#e334e3', shadowOpacity: 0.3,
        shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    cardGlow1: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#e334e3', opacity: 0.18, top: -30, left: -20,
    },
    cardGlow2: {
        position: 'absolute', width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#6c00ff', opacity: 0.2, bottom: -30, right: -10,
    },
    chip: {
        width: 28, height: 20, borderRadius: 4,
        backgroundColor: '#f0c040', marginBottom: 10,
        justifyContent: 'center', alignItems: 'center',
    },
    chipInner: { width: 18, height: 1, backgroundColor: '#c8940080' },
    cardBrand: {
        position: 'absolute', top: 16, right: 16,
        color: 'white', fontWeight: '900', fontSize: 13, fontStyle: 'italic', letterSpacing: 1,
    },
    cardNum: {
        color: 'white', fontSize: 15, fontWeight: '600',
        letterSpacing: 2.5, marginBottom: 10,
        fontVariant: ['tabular-nums'],
    },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between' },
    cardLbl: { color: 'rgba(255,255,255,0.4)', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 1 },
    cardVal: { color: 'white', fontWeight: '700', fontSize: 12, letterSpacing: 1 },

    // Fields
    field: {
        flexDirection: 'row', alignItems: 'center',
        height: 50, borderRadius: 13, paddingHorizontal: 14, gap: 10,
        marginBottom: 12, borderWidth: 1.5, borderColor: 'transparent',
    },
    fieldFocused: { borderColor: '#e334e3' },
    fieldInput: { flex: 1, fontSize: 16, letterSpacing: 2, fontWeight: '600' },
    lbl: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

    // Row
    row: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-end' },
    drumWrap: { flex: 1 },
    drumsBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
        borderRadius: 13, paddingVertical: 4,
    },

    // CVV
    cvvWrap: { width: SCREEN_W * 0.28 },
    cvvField: {
        height: ITEM_H * VISIBLE + 8,
        flexDirection: 'column', justifyContent: 'center',
        paddingHorizontal: 0, marginBottom: 0,
    },
    cvvInput: {
        fontSize: 22, fontWeight: '800',
        letterSpacing: 8, textAlign: 'center', width: '100%',
    },

    // Save
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#e334e3', height: 52, borderRadius: 16,
        shadowColor: '#e334e3', shadowOpacity: 0.4, shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 }, elevation: 8,
    },
    saveTxt: { color: 'white', fontWeight: '800', fontSize: 16 },
});
