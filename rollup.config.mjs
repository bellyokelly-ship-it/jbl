import resolve   from "@rollup/plugin-node-resolve";
import commonjs  from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import replace    from "@rollup/plugin-replace";

const externals = ["react", "react-dom", "decky-frontend-lib"];

export default {
  input: "src/index.tsx",
  output: {
    file:    "dist/index.js",
    format:  "iife",
    globals: {
      react:                "SP_REACT",
      "react-dom":          "SP_REACTDOM",
      "decky-frontend-lib": "DFL",
    },
  },
  external: (id) => externals.includes(id),
  plugins: [
    resolve({
      resolveOnly: (module) => !externals.includes(module),
    }),
    commonjs(),
    replace({
      preventAssignment: true,
      values: {
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
    }),
    typescript({ tsconfig: "./tsconfig.json" }),
  ],
};
