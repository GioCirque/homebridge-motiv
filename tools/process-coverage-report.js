var gulp = require('gulp'),
  inlinesource = require('gulp-inline-source');

gulp.task('inline', function() {
  return gulp
    .src('./.testing/coverage/lcov-report/*.html')
    .pipe(
      inlinesource({
        attribute: false,
        rootpath: './.testing/coverage/lcov-report/',
      })
    )
    .pipe(gulp.dest('./.testing/coverage/lcov-report/'));
});
gulp.start('inline');
