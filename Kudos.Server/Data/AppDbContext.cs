using CsvHelper.Configuration.Attributes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Kudos.Server.Data
{
    public class AppDbContext : DbContext
    {
        protected readonly IConfiguration Configuration;

        public AppDbContext(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        protected override void OnConfiguring(DbContextOptionsBuilder options)
        {
            // connect to postgres with connection string from app settings
            options.UseNpgsql(Configuration.GetConnectionString("WebApiDatabase")).LogTo(Console.WriteLine, LogLevel.Information);
            //options.UseNpgsql(Configuration.GetConnectionString("WebApiDatabase"));
        }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

        }
    }
}
