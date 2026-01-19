import React, { useEffect } from "react";
import { View, ViewProps } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

interface LoadingSquaresProps extends ViewProps {
    /**
     * Size of each square in pixels
     * @default 16
     */
    squareSize?: number;

    /**
     * Gap between squares
     * @default 8
     */
    gap?: number;

    /**
     * Colors of the squares (green, orange, yellow)
     */
    colors?: [string, string, string];
}

/**
 * LoadingSquares Component
 *
 * Animates the three colored squares from the Eduly logo.
 * Each square bounces up and down in sequence, creating a
 * playful "dancing" effect that indicates loading.
 *
 * Usage:
 * ```tsx
 * <LoadingSquares squareSize={20} gap={8} />
 * ```
 */
export function LoadingSquares({
    squareSize = 16,
    gap = 8,
    colors = ["#22c55e", "#f97316", "#eab308"],
    style,
    ...props
}: LoadingSquaresProps) {
    // Shared values for each square's vertical animation
    const square1Y = useSharedValue(0);
    const square2Y = useSharedValue(0);
    const square3Y = useSharedValue(0);

    useEffect(() => {
        // Square 1 - starts immediately
        square1Y.value = withRepeat(
            withTiming(-24, {
                duration: 600,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true
        );

        // Square 2 - starts after 150ms
        square2Y.value = withDelay(
            150,
            withRepeat(
                withTiming(-24, {
                    duration: 600,
                    easing: Easing.inOut(Easing.ease),
                }),
                -1,
                true
            )
        );

        // Square 3 - starts after 300ms
        square3Y.value = withDelay(
            300,
            withRepeat(
                withTiming(-24, {
                    duration: 600,
                    easing: Easing.inOut(Easing.ease),
                }),
                -1,
                true
            )
        );
    }, []);

    // Animated styles
    const square1Style = useAnimatedStyle(() => ({
        transform: [{ translateY: square1Y.value }],
    }));

    const square2Style = useAnimatedStyle(() => ({
        transform: [{ translateY: square2Y.value }],
    }));

    const square3Style = useAnimatedStyle(() => ({
        transform: [{ translateY: square3Y.value }],
    }));

    return (
        <View
            accessibilityLabel="Carregando com quadradinhos"
            accessibilityRole="progressbar"
            style={[
                {
                    flexDirection: "row",
                    gap: gap,
                    justifyContent: "center",
                    alignItems: "flex-end",
                    height: squareSize + 24,
                },
                style,
            ]}
            {...props}
        >
            {/* Square 1 - Green */}
            <Animated.View
                style={[
                    {
                        width: squareSize,
                        height: squareSize,
                        backgroundColor: colors[0],
                        borderRadius: 4,
                    },
                    square1Style,
                ]}
            />

            {/* Square 2 - Orange */}
            <Animated.View
                style={[
                    {
                        width: squareSize,
                        height: squareSize,
                        backgroundColor: colors[1],
                        borderRadius: 4,
                    },
                    square2Style,
                ]}
            />

            {/* Square 3 - Yellow */}
            <Animated.View
                style={[
                    {
                        width: squareSize,
                        height: squareSize,
                        backgroundColor: colors[2],
                        borderRadius: 4,
                    },
                    square3Style,
                ]}
            />
        </View>
    );
}
