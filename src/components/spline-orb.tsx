"use client";

import Spline from '@splinetool/react-spline';

export function SplineOrb() {
    return (
        <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
            <Spline
                scene="https://my.spline.design/untitled-yEbDny5XwBykfccEbY69RsUe/"
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    );
}