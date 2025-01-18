const getKarat = (density) => {
  const densityKaratMap = [
    // 10 KARATS
    { range: [13.0, 13.02], karat: 10.0 },
    { range: [13.03, 13.05], karat: 10.1 },
    { range: [13.06, 13.08], karat: 10.2 },
    { range: [13.09, 13.11], karat: 10.3 },
    { range: [13.12, 13.14], karat: 10.4 },
    { range: [13.15, 13.17], karat: 10.5 },
    { range: [13.18, 13.21], karat: 10.6 },
    { range: [13.22, 13.24], karat: 10.7 },
    { range: [13.25, 13.27], karat: 10.8 },
    { range: [13.28, 13.3], karat: 10.9 },
    // 11 KARATS
    { range: [13.31, 13.33], karat: 11.0 },
    { range: [13.34, 13.37], karat: 11.1 },
    { range: [13.38, 13.4], karat: 11.2 },
    { range: [13.41, 13.43], karat: 11.3 },
    { range: [13.44, 13.46], karat: 11.4 },
    { range: [13.47, 13.5], karat: 11.5 },
    { range: [13.51, 13.53], karat: 11.6 },
    { range: [13.54, 13.56], karat: 11.7 },
    { range: [13.57, 13.6], karat: 11.8 },
    { range: [13.61, 13.63], karat: 11.9 },
    // 12 KARATS
    { range: [13.64, 13.66], karat: 12.0 },
    { range: [13.67, 13.7], karat: 12.1 },
    { range: [13.71, 13.73], karat: 12.2 },
    { range: [13.74, 13.77], karat: 12.3 },
    { range: [13.78, 13.8], karat: 12.4 },
    { range: [13.81, 13.83], karat: 12.5 },
    { range: [13.84, 13.87], karat: 12.6 },
    { range: [13.88, 13.9], karat: 12.7 },
    { range: [13.91, 13.94], karat: 12.8 },
    { range: [13.95, 13.97], karat: 12.9 },
    // 13 KARATS
    { range: [13.98, 14.01], karat: 13.0 },
    { range: [14.02, 14.05], karat: 13.1 },
    { range: [14.06, 14.08], karat: 13.2 },
    { range: [14.09, 14.12], karat: 13.3 },
    { range: [14.13, 14.15], karat: 13.4 },
    { range: [14.16, 14.19], karat: 13.5 },
    { range: [14.2, 14.23], karat: 13.6 },
    { range: [14.24, 14.26], karat: 13.7 },
    { range: [14.27, 14.3], karat: 13.8 },
    { range: [14.31, 14.34], karat: 13.9 },
    // 14 KARATS
    { range: [14.35, 14.37], karat: 14.0 },
    { range: [14.38, 14.41], karat: 14.1 },
    { range: [14.42, 14.45], karat: 14.2 },
    { range: [14.46, 14.49], karat: 14.3 },
    { range: [14.5, 14.53], karat: 14.4 },
    { range: [14.54, 14.56], karat: 14.5 },
    { range: [14.57, 14.6], karat: 14.6 },
    { range: [14.61, 14.64], karat: 14.7 },
    { range: [14.65, 14.68], karat: 14.8 },
    { range: [14.69, 14.72], karat: 14.9 },
    // 15 KARATS
    { range: [14.73, 14.76], karat: 15.0 },
    { range: [14.77, 14.8], karat: 15.1 },
    { range: [14.81, 14.84], karat: 15.2 },
    { range: [14.85, 14.88], karat: 15.3 },
    { range: [14.89, 14.92], karat: 15.4 },
    { range: [14.93, 14.96], karat: 15.5 },
    { range: [14.97, 15.0], karat: 15.6 },
    { range: [15.01, 15.04], karat: 15.7 },
    { range: [15.05, 15.08], karat: 15.8 },
    { range: [15.09, 15.12], karat: 15.9 },
    // 16 KARATS
    { range: [15.13, 15.16], karat: 16.0 },
    { range: [15.17, 15.21], karat: 16.1 },
    { range: [15.22, 15.26], karat: 16.2 },
    { range: [15.26, 15.29], karat: 16.3 },
    { range: [15.3, 15.33], karat: 16.4 },
    { range: [15.34, 15.37], karat: 16.5 },
    { range: [15.38, 15.42], karat: 16.6 },
    { range: [15.43, 15.46], karat: 16.7 },
    { range: [15.47, 15.5], karat: 16.8 },
    { range: [15.51, 15.55], karat: 16.9 },
    // 17 KARATS
    { range: [15.56, 15.59], karat: 17.0 },
    { range: [15.6, 15.64], karat: 17.1 },
    { range: [15.65, 15.68], karat: 17.2 },
    { range: [15.69, 15.72], karat: 17.3 },
    { range: [15.73, 15.77], karat: 17.4 },
    { range: [15.78, 15.81], karat: 17.5 },
    { range: [15.82, 15.86], karat: 17.6 },
    { range: [15.87, 15.91], karat: 17.7 },
    { range: [15.92, 15.95], karat: 17.8 },
    { range: [15.96, 16.0], karat: 17.9 },
    // 18 KARATS
    { range: [16.01, 16.04], karat: 18.0 },
    { range: [16.05, 16.09], karat: 18.1 },
    { range: [16.1, 16.14], karat: 18.2 },
    { range: [16.15, 16.19], karat: 18.3 },
    { range: [16.2, 16.23], karat: 18.4 },
    { range: [16.24, 16.28], karat: 18.5 },
    { range: [16.29, 16.33], karat: 18.6 },
    { range: [16.34, 16.38], karat: 18.7 },
    { range: [16.39, 16.43], karat: 18.8 },
    { range: [16.44, 16.48], karat: 18.9 },
    // 19 KARATS
    { range: [16.49, 16.52], karat: 19.0 },
    { range: [16.53, 16.57], karat: 19.1 },
    { range: [16.58, 16.62], karat: 19.2 },
    { range: [16.63, 16.67], karat: 19.3 },
    { range: [16.68, 16.72], karat: 19.4 },
    { range: [16.73, 16.78], karat: 19.5 },
    { range: [16.79, 16.83], karat: 19.6 },
    { range: [16.84, 16.88], karat: 19.7 },
    { range: [16.89, 16.93], karat: 19.8 },
    { range: [16.94, 16.98], karat: 19.9 },
    // 20 KARATS
    { range: [16.99, 17.03], karat: 20.0 },
    { range: [17.04, 17.09], karat: 20.1 },
    { range: [17.1, 17.14], karat: 20.2 },
    { range: [17.15, 17.2], karat: 20.3 },
    { range: [17.21, 17.25], karat: 20.4 },
    { range: [17.26, 17.3], karat: 20.5 },
    { range: [17.31, 17.36], karat: 20.6 },
    { range: [17.37, 17.41], karat: 20.7 },
    { range: [17.42, 17.46], karat: 20.8 },
    { range: [17.47, 17.52], karat: 20.9 },
    // 21 KARATS
    { range: [17.53, 17.58], karat: 21.0 },
    { range: [17.59, 17.63], karat: 21.1 },
    { range: [17.64, 17.69], karat: 21.2 },
    { range: [17.7, 17.75], karat: 21.3 },
    { range: [17.76, 17.8], karat: 21.4 },
    { range: [17.81, 17.86], karat: 21.5 },
    { range: [17.87, 17.92], karat: 21.6 },
    { range: [17.93, 17.98], karat: 21.7 },
    { range: [17.99, 18.04], karat: 21.8 },
    { range: [18.05, 18.09], karat: 21.9 },
    // 22 KARATS
    { range: [18.1, 18.15], karat: 22.0 },
    { range: [18.16, 18.21], karat: 22.1 },
    { range: [18.22, 18.27], karat: 22.2 },
    { range: [18.28, 18.33], karat: 22.3 },
    { range: [18.34, 18.4], karat: 22.4 },
    { range: [18.41, 18.46], karat: 22.5 },
    { range: [18.47, 18.52], karat: 22.6 },
    { range: [18.53, 18.58], karat: 22.7 },
    { range: [18.59, 18.64], karat: 22.8 },
    { range: [18.65, 18.71], karat: 22.9 },
    // 24/23 KARATS
    { range: [18.72, 18.77], karat: 23.0 },
    { range: [18.78, 18.83], karat: 23.1 },
    { range: [18.84, 18.9], karat: 23.2 },
    { range: [18.91, 18.96], karat: 23.3 },
    { range: [18.97, 19.0], karat: 23.4 },

    { range: [19.1, 19.1], karat: 23.6 },
    { range: [19.2, 19.2], karat: 23.75 },
    { range: [19.3, 19.3], karat: 24 },
  ];

  for (const { range, karat } of densityKaratMap) {
    if (density >= range[0] && density <= range[1]) {
      return karat.toFixed(2);
    }
  }
  return 0; // if the dencity is not match
};

export default getKarat;
