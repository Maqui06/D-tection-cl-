import cv from 'opencv.js';
import sharp from 'sharp';

export class KeyRecognition {
  constructor() {
    // Increased number of features and improved parameters for better detection
    this.orb = new cv.ORB(
      3000,  // nfeatures: increased for better detection
      1.2,   // scaleFactor: for scale invariance
      8,     // nlevels: pyramid levels
      31,    // edgeThreshold
      0,     // firstLevel
      2,     // WTA_K: number of points for orientation
      cv.ORB_HARRIS_SCORE,
      31,    // patchSize: increased for better descriptors
      20     // fastThreshold
    );
    
    // Using k-nearest neighbor matching for better results
    this.matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
  }

  async preprocessImage(buffer) {
    try {
      // Enhanced image preprocessing pipeline
      const image = await sharp(buffer)
        .grayscale()
        .resize(1024, null, { fit: 'inside' }) // Larger size for more detail
        .normalize()
        .sharpen({ sigma: 2, m1: 1, m2: 2 }) // Enhanced sharpening
        .gamma(1.2) // Improve contrast
        .toBuffer();

      // Convert buffer to OpenCV matrix
      const mat = cv.imdecode(new Uint8Array(image), cv.IMREAD_GRAYSCALE);
      
      // Create working copies
      const processed = new cv.Mat();
      const blurred = new cv.Mat();
      const edges = new cv.Mat();
      
      try {
        // Adaptive histogram equalization for better contrast
        cv.CLAHE.apply(cv.CLAHE.create(3.0, new cv.Size(8, 8)), mat, processed);
        
        // Bilateral filter to reduce noise while preserving edges
        cv.bilateralFilter(processed, blurred, 9, 75, 75);
        
        // Edge enhancement using Canny
        cv.Canny(blurred, edges, 50, 150);
        
        // Combine edge information with original
        cv.addWeighted(processed, 0.7, edges, 0.3, 0, processed);
        
        return processed;
      } finally {
        // Cleanup intermediate matrices
        mat.delete();
        blurred.delete();
        edges.delete();
      }
    } catch (error) {
      console.error('Preprocessing error:', error);
      throw error;
    }
  }

  detectKeypoints(mat) {
    const mask = new cv.Mat();
    const keypoints = new cv.KeyPointVector();
    const descriptors = new cv.Mat();
    
    try {
      this.orb.detectAndCompute(mat, mask, keypoints, descriptors);
      return { keypoints, descriptors };
    } finally {
      mask.delete();
    }
  }

  matchDescriptors(desc1, desc2) {
    if (!desc1 || !desc2 || desc1.empty() || desc2.empty()) {
      return {
        matches: [],
        score: Infinity,
        isMatch: false,
        confidence: 0
      };
    }

    const matches = new cv.DMatchVector();
    
    try {
      this.matcher.match(desc1, desc2, matches);
      
      if (matches.size() === 0) {
        return {
          matches: [],
          score: Infinity,
          isMatch: false,
          confidence: 0
        };
      }

      // Calculate distance statistics
      const distances = Array(matches.size()).fill(0)
        .map((_, i) => matches.get(i).distance);
      
      const minDist = Math.min(...distances);
      const maxDist = Math.max(...distances);
      
      // Adaptive threshold based on distance distribution
      const threshold = Math.min(
        2 * minDist,
        0.75 * (minDist + maxDist)
      );

      // Filter good matches
      const goodMatches = [];
      let totalDistance = 0;
      
      for (let i = 0; i < matches.size(); i++) {
        const match = matches.get(i);
        if (match.distance <= threshold) {
          goodMatches.push(match);
          totalDistance += match.distance;
        }
      }

      // Calculate match statistics
      const matchScore = goodMatches.length > 0 
        ? totalDistance / goodMatches.length 
        : Infinity;
      
      const minRequiredMatches = 20;
      const scoreThreshold = 45;
      const confidence = (goodMatches.length / Math.min(desc1.rows, desc2.rows)) * 100;

      return {
        matches: goodMatches,
        score: matchScore,
        isMatch: goodMatches.length >= minRequiredMatches && matchScore < scoreThreshold,
        confidence: Math.min(confidence, 100)
      };
    } finally {
      matches.delete();
    }
  }

  async compareKeys(newKeyBuffer, existingKeyDescriptors) {
    let newKeyMat = null;
    let newDescriptors = null;
    
    try {
      newKeyMat = await this.preprocessImage(newKeyBuffer);
      const detection = this.detectKeypoints(newKeyMat);
      newDescriptors = detection.descriptors;

      if (!newDescriptors || newDescriptors.empty() || 
          !existingKeyDescriptors || existingKeyDescriptors.empty()) {
        return {
          isMatch: false,
          score: Infinity,
          confidence: 0,
          error: 'Invalid descriptors'
        };
      }

      return this.matchDescriptors(newDescriptors, existingKeyDescriptors);
    } catch (error) {
      console.error('Key comparison error:', error);
      return {
        isMatch: false,
        score: Infinity,
        confidence: 0,
        error: error.message
      };
    } finally {
      // Cleanup resources
      if (newKeyMat) newKeyMat.delete();
      if (newDescriptors) newDescriptors.delete();
    }
  }

  dispose() {
    if (this.orb) this.orb.delete();
    if (this.matcher) this.matcher.delete();
  }
}